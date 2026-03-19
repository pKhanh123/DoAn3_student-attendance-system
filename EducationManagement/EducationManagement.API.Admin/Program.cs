using System.Reflection;
using System.Text;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.ResponseCompression;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Scrutor;
using System.IO.Compression;

var builder = WebApplication.CreateBuilder(args);

// ============================================================
// 🔹 1️⃣ Kết nối Database (DAL) - Sử dụng DatabaseHelper thay vì EF Core
// ============================================================
// Không cần AddDbContext vì đã chuyển sang sử dụng DatabaseHelper

// ============================================================
// 🔹 2️⃣ Đăng ký toàn bộ Services + Repositories
// ============================================================
// ✅ AUTO-REGISTERS ALL SERVICES & REPOSITORIES using Scrutor
// Including Phase 2 Enrollment System:
//    - AdministrativeClassService & Repository
//    - RegistrationPeriodService & Repository
//    - EnrollmentService & Repository (enhanced)
//    - SubjectPrerequisiteService & Repository
builder.Services.Scan(scan => scan
    .FromAssemblies(
        Assembly.Load("EducationManagement.BLL"),
        Assembly.Load("EducationManagement.DAL")
    )
    .AddClasses(classes => classes.InNamespaces(
        "EducationManagement.BLL.Services",
        "EducationManagement.DAL.Repositories"
    ).Where(type => !type.IsAssignableTo(typeof(Microsoft.Extensions.Hosting.IHostedService))))
    .AsSelfWithInterfaces()
    .WithScopedLifetime()
);

// ✅ Explicit registration for IRefreshTokenStore (DATABASE storage - SCALABLE!)
// ❌ REMOVED: InMemoryRefreshTokenStore (not scalable for production)
builder.Services.AddScoped<EducationManagement.BLL.Services.IRefreshTokenStore,
    EducationManagement.BLL.Services.DatabaseRefreshTokenStore>();

// ✅ Register SignalR Notification Hub Context (for real-time notifications)
builder.Services.AddScoped<EducationManagement.Common.Interfaces.INotificationHubContext,
    EducationManagement.API.Admin.Helpers.SignalRNotificationHubContext>();

// ✅ Register OTPService (no interface, needs explicit registration)
builder.Services.AddScoped<EducationManagement.BLL.Services.OTPService>();

// ✅ Register RoomService (explicit registration to ensure it's available)
builder.Services.AddScoped<EducationManagement.BLL.Services.RoomService>();

// ✅ Register Exam Reminder Notification Background Service (for scheduled notifications)
builder.Services.AddHostedService<EducationManagement.BLL.Services.ExamReminderNotificationService>();

// ============================================================
// 🔹 2.5️⃣ REDIS CACHING (OPTIONAL - Fallback to Memory Cache if Redis unavailable)
// ============================================================
var redisConnectionString = builder.Configuration.GetValue<string>("Redis:ConnectionString") ?? "localhost:6379";
var useRedis = builder.Configuration.GetValue<bool>("Redis:Enabled");

if (useRedis)
{
    try
    {
        builder.Services.AddStackExchangeRedisCache(options =>
        {
            options.Configuration = redisConnectionString;
            options.InstanceName = "EduSystem_";
        });
    }
    catch (Exception ex)
    {
        builder.Services.AddDistributedMemoryCache();
    }
}
else
{
    // Fallback to in-memory cache if Redis is disabled
    builder.Services.AddDistributedMemoryCache();
}

// ============================================================
// 🔹 2.6️⃣ RESPONSE COMPRESSION (Gzip + Brotli)
// ============================================================
builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
    options.Providers.Add<BrotliCompressionProvider>();
    options.Providers.Add<GzipCompressionProvider>();
});

builder.Services.Configure<BrotliCompressionProviderOptions>(options =>
{
    options.Level = CompressionLevel.Fastest;
});

builder.Services.Configure<GzipCompressionProviderOptions>(options =>
{
    options.Level = CompressionLevel.Fastest;
});

// ============================================================
// 🔹 2.7️⃣ RATE LIMITING (DDoS Protection)
// ============================================================
var isDev = builder.Environment.IsDevelopment();

builder.Services.AddRateLimiter(options =>
{
    // Global rate limit - 100 requests per minute per user/IP
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
    {
        var username = context.User.Identity?.Name ?? context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: username,
            factory: _ => new FixedWindowRateLimiterOptions
            {
                // Nới lỏng limit ở môi trường Development để tránh 429 khi FE reload/hot-reload
                PermitLimit = isDev ? 1000 : 100,
                Window = TimeSpan.FromMinutes(1),
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 0
            });
    });

    // Stricter rate limit for login endpoint - 5 requests per 15 minutes per IP
    options.AddPolicy("login", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window = TimeSpan.FromMinutes(15),
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 0
            }));

    // Rejection response
    options.OnRejected = async (context, token) =>
    {
        context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
        await context.HttpContext.Response.WriteAsJsonAsync(new
        {
            error = "Too many requests",
            message = "Rate limit exceeded. Please try again later.",
            retryAfter = context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter)
                ? (double?)retryAfter.TotalSeconds
                : (double?)null
        }, cancellationToken: token);
    };
});

// ============================================================
// 🔹 3️⃣ Cấu hình Controller, Swagger, CORS, SignalR
// ============================================================
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // ✅ Configure JSON serialization to use camelCase (JavaScript convention)
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Title = "Education Management API - Admin",
        Version = "v1",
        Description = "API for Education Management System - Admin Module"
    });
    
    // ✅ Include XML comments if available
    var xmlFile = $"{System.Reflection.Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
    if (File.Exists(xmlPath))
    {
        options.IncludeXmlComments(xmlPath);
    }
    
    // ✅ Ignore circular references
    options.CustomSchemaIds(type => type.FullName);
    
    // ✅ Ensure all controllers are included
    options.DocInclusionPredicate((docName, apiDesc) =>
    {
        // Include all APIs
        return true;
    });
    
    // ✅ JWT Bearer Authentication cho Swagger
    options.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\"",
        Name = "Authorization",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.ApiKey,
        Scheme = "Bearer",
        BearerFormat = "JWT"
    });
    
    options.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// ✅ SignalR for real-time notifications
builder.Services.AddSignalR();

builder.Services.AddCors(options =>
{
    // Policy cho SignalR và các request cần credentials
    options.AddPolicy("AllowFrontendWithCredentials", policy =>
    {
        policy
            .WithOrigins(
                "http://127.0.0.1:5500",
                "http://localhost:5500",
                "https://localhost:5500",
                "http://127.0.0.1:5501",
                "http://localhost:5501",
                "https://localhost:5501",
                "http://127.0.0.1:3000",
                "http://localhost:3000",
                "https://localhost:3000"
            )
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials(); // ✅ QUAN TRỌNG: Cho phép credentials cho SignalR
    });
    
    // Policy cho các request không cần credentials (fallback)
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy
            .SetIsOriginAllowed(origin => 
            {
                // Allow null origin (file:// protocol) - but can't use AllowCredentials with this
                if (string.IsNullOrEmpty(origin) || origin == "null")
                    return true;
                
                // Allow localhost and 127.0.0.1 with any port
                try
                {
                    var uri = new Uri(origin);
                    return uri.Host == "localhost" || 
                           uri.Host == "127.0.0.1" || 
                           uri.Host == "::1" ||
                           origin.StartsWith("https://localhost") ||
                           origin.StartsWith("http://localhost") ||
                           origin.StartsWith("http://127.0.0.1");
                }
                catch
                {
                    return false;
                }
            })
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

// ============================================================
// 🔹 4️⃣ JWT Authentication
// ============================================================
var jwtSection = builder.Configuration.GetSection("Jwt");
var secretKey = jwtSection.GetValue<string>("SecretKey") ?? "BiLoSecretKeyThiPhaiLamSao?ThiPhaiChiu!!";
var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        // ✅ Cho phép Gateway (HTTPS) gọi tới Admin API (HTTP)
        options.RequireHttpsMetadata = false;
        options.SaveToken = true;
        
        // ✅ QUAN TRỌNG: Không tự động challenge khi không có token
        // Cho phép anonymous requests tiếp tục
        options.Challenge = "Bearer";
        options.Events = new JwtBearerEvents
        {
            // ✅ Khi không có token hoặc token invalid, KHÔNG challenge
            // Cho phép request tiếp tục - authorization middleware sẽ quyết định
            OnChallenge = context =>
            {
                var path = context.HttpContext.Request.Path.Value ?? "";
                var endpoint = context.HttpContext.GetEndpoint();
                var hasAllowAnonymous = endpoint?.Metadata.GetMetadata<AllowAnonymousAttribute>() != null;
                
                // ✅ QUAN TRỌNG: Kiểm tra path trực tiếp vì endpoint metadata có thể chưa được load
                var isAuthPath = path.StartsWith("/api-edu/auth", StringComparison.OrdinalIgnoreCase);
                
                // 🔍 DEBUG LOG
                Console.ForegroundColor = ConsoleColor.Yellow;
                Console.WriteLine($"[JWT OnChallenge] Path: {path}");
                Console.WriteLine($"[JWT OnChallenge] Endpoint: {endpoint?.DisplayName ?? "null"}");
                Console.WriteLine($"[JWT OnChallenge] HasAllowAnonymous: {hasAllowAnonymous}");
                Console.WriteLine($"[JWT OnChallenge] IsAuthPath: {isAuthPath}");
                Console.WriteLine($"[JWT OnChallenge] Error: {context.Error}");
                Console.WriteLine($"[JWT OnChallenge] ErrorDescription: {context.ErrorDescription}");
                Console.ResetColor();
                
                // ✅ Nếu endpoint có [AllowAnonymous] HOẶC là auth path, SKIP challenge hoàn toàn
                if (hasAllowAnonymous || isAuthPath)
                {
                    Console.ForegroundColor = ConsoleColor.Green;
                    Console.WriteLine($"[JWT OnChallenge] ✅ Skipping challenge for anonymous endpoint: {path}");
                    Console.ResetColor();
                    // ✅ QUAN TRỌNG: Handle response để skip challenge, nhưng không block request
                    context.HandleResponse();
                    return Task.CompletedTask;
                }
                
                // Endpoint yêu cầu authentication - thực hiện challenge bình thường
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"[JWT OnChallenge] ❌ Challenging for protected endpoint: {path}");
                Console.ResetColor();
                return Task.CompletedTask;
            },
            OnAuthenticationFailed = context =>
            {
                var path = context.HttpContext.Request.Path.Value ?? "";
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"[JWT OnAuthenticationFailed] Path: {path}");
                Console.WriteLine($"[JWT OnAuthenticationFailed] Exception: {context.Exception?.Message}");
                Console.ResetColor();
                
                // ✅ KHÔNG tự động challenge - để authorization middleware quyết định
                context.NoResult();
                return Task.CompletedTask;
            },
            // ✅ SignalR: Đọc JWT token từ query string (access_token)
            OnMessageReceived = context =>
            {
                // SignalR gửi token qua query string, không phải header
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;

                // Chỉ áp dụng cho SignalR hub endpoints
                if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/notificationHub"))
                {
                    context.Token = accessToken;
                }

                return Task.CompletedTask;
            }
        };
        
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtSection["Issuer"],
            ValidAudience = jwtSection["Audience"],
            IssuerSigningKey = key,
            ClockSkew = TimeSpan.Zero,
            // ✅ QUAN TRỌNG: Cho phép authentication scheme thành công ngay cả khi không có token
            // Không throw exception khi không có token
            RequireSignedTokens = true
        };
    });

// ✅ Cấu hình Authorization để cho phép anonymous mặc định
// ✅ Register PermissionAuthorizationHandler
builder.Services.AddScoped<IAuthorizationHandler, EducationManagement.API.Admin.Authorization.PermissionAuthorizationHandler>();

// ✅ Register PermissionPolicyProvider để tạo policy động cho permissions
builder.Services.AddSingleton<IAuthorizationPolicyProvider, EducationManagement.API.Admin.Authorization.PermissionPolicyProvider>();

builder.Services.AddAuthorization(options =>
{
    // ✅ Default policy: Cho phép anonymous nếu không có [Authorize]
    // Chỉ yêu cầu authentication nếu có [Authorize] attribute
    options.FallbackPolicy = null; // Cho phép anonymous mặc định
});

// ============================================================
// 🔹 5️⃣ Build app
// ============================================================
var app = builder.Build();

// ============================================================
// 🔹 6️⃣ SERVE STATIC FILES (Avatars)
// ============================================================
var projectRoot = Directory.GetParent(Directory.GetCurrentDirectory())?.FullName;
var avatarFolder = Path.Combine(projectRoot!, "Avatar_User");

if (!Directory.Exists(avatarFolder))
{
    Directory.CreateDirectory(avatarFolder);
}

// Serve static files từ Avatar_User folder với URL prefix /avatars
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(avatarFolder),
    RequestPath = "/avatars"
});

// ============================================================
// 🔹 7️⃣ Middleware pipeline
// ============================================================
// ⚠️ IMPORTANT: Thứ tự middleware rất quan trọng!
// 1. CORS phải đứng đầu để xử lý preflight requests
// 2. Response Compression sau CORS
// 3. Rate Limiting
// 4. Authentication/Authorization
// ============================================================

// ✅ CORS MUST BE FIRST! (để xử lý preflight OPTIONS requests)
app.UseCors("AllowFrontend");

// ⚠️ Response Compression sau CORS
// Note: Browser Link warnings for Swagger are harmless and can be ignored
app.UseResponseCompression();

// ⚠️ Rate Limiting
app.UseRateLimiter();

// ⚠️ Không redirect HTTPS (Gateway đã xử lý SSL termination)
// app.UseHttpsRedirection(); // DISABLED

// ✅ DEBUG: Middleware để log request flow
app.Use(async (context, next) =>
{
    var path = context.Request.Path.Value ?? "";
    if (path.StartsWith("/api-edu/auth"))
    {
        Console.ForegroundColor = ConsoleColor.Cyan;
        Console.WriteLine($"[Middleware] Request: {context.Request.Method} {path}");
        Console.WriteLine($"[Middleware] Has Authorization Header: {context.Request.Headers.ContainsKey("Authorization")}");
        Console.ResetColor();
    }
    await next();
    if (path.StartsWith("/api-edu/auth"))
    {
        Console.ForegroundColor = ConsoleColor.Cyan;
        Console.WriteLine($"[Middleware] Response: {context.Response.StatusCode} for {path}");
        Console.ResetColor();
    }
});

app.UseAuthentication();
app.UseAuthorization();

// ✅ DEBUG: Log sau authentication/authorization
app.Use(async (context, next) =>
{
    var path = context.Request.Path.Value ?? "";
    if (path.StartsWith("/api-edu/auth"))
    {
        var endpoint = context.GetEndpoint();
        var hasAllowAnonymous = endpoint?.Metadata.GetMetadata<AllowAnonymousAttribute>() != null;
        var isAuthenticated = context.User?.Identity?.IsAuthenticated ?? false;
        
        Console.ForegroundColor = ConsoleColor.Magenta;
        Console.WriteLine($"[After Auth] Path: {path}");
        Console.WriteLine($"[After Auth] Endpoint: {endpoint?.DisplayName ?? "null"}");
        Console.WriteLine($"[After Auth] HasAllowAnonymous: {hasAllowAnonymous}");
        Console.WriteLine($"[After Auth] IsAuthenticated: {isAuthenticated}");
        Console.ResetColor();
    }
    await next();
});

// ✅ Swagger - chỉ bật trong Development
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// ✅ Controller endpoints
app.MapControllers();

// ✅ SignalR Hub endpoints - Sử dụng CORS policy với credentials
app.MapHub<EducationManagement.API.Admin.Hubs.NotificationHub>("/notificationHub")
    .RequireCors("AllowFrontendWithCredentials");

// ============================================================
// 🚀 Run
// ============================================================
app.Run();