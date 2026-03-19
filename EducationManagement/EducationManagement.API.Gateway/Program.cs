using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.IdentityModel.Tokens;
using Microsoft.Extensions.FileProviders;
using Ocelot.DependencyInjection;
using Ocelot.Middleware;
using System.Text;
using System.Reflection;

var builder = WebApplication.CreateBuilder(args);

// ============================================================
// 🧩 1️⃣ Load cấu hình Ocelot
// ============================================================
builder.Configuration.AddJsonFile("ocelot.json", optional: false, reloadOnChange: true);

// ============================================================
// 🧩 2️⃣ JWT Authentication
// ============================================================
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.RequireHttpsMetadata = false;
        options.SaveToken = true;

        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:SecretKey"]!)
            )
        };

        // 🧠 Ghi log JWT để debug và xử lý anonymous requests
        options.Events = new JwtBearerEvents
        {
            OnAuthenticationFailed = context =>
            {
                var path = context.HttpContext.Request.Path.Value ?? "";
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"[Gateway JWT] ❌ Authentication Failed: {path}");
                Console.WriteLine($"[Gateway JWT] Exception: {context.Exception?.Message}");
                Console.ResetColor();
                
                // ✅ Cho phép anonymous requests tiếp tục - Ocelot sẽ quyết định
                context.NoResult();
                return Task.CompletedTask;
            },
            OnChallenge = context =>
            {
                var path = context.HttpContext.Request.Path.Value ?? "";
                var isAuthPath = path.StartsWith("/api-edu/auth", StringComparison.OrdinalIgnoreCase);
                
                Console.ForegroundColor = ConsoleColor.Yellow;
                Console.WriteLine($"[Gateway JWT] OnChallenge: {path}");
                Console.WriteLine($"[Gateway JWT] IsAuthPath: {isAuthPath}");
                Console.WriteLine($"[Gateway JWT] Error: {context.Error}");
                Console.ResetColor();
                
                // ✅ QUAN TRỌNG: Skip challenge cho auth routes
                // Gateway không nên challenge các auth endpoints vì chúng cần anonymous access
                if (isAuthPath)
                {
                    Console.ForegroundColor = ConsoleColor.Green;
                    Console.WriteLine($"[Gateway JWT] ✅ Skipping challenge for auth endpoint: {path}");
                    Console.ResetColor();
                    context.HandleResponse();
                    return Task.CompletedTask;
                }
                
                // Cho các protected routes khác, thực hiện challenge bình thường
                return Task.CompletedTask;
            },
            OnTokenValidated = context =>
            {
                Console.ForegroundColor = ConsoleColor.Green;
                Console.WriteLine($"[Gateway JWT] ✅ Token Valid: {context.Principal?.Identity?.Name}");
                Console.ResetColor();
                return Task.CompletedTask;
            }
        };
    });

// ✅ Cấu hình Authorization để cho phép anonymous mặc định
// Gateway chỉ enforce authentication cho routes có AuthenticationOptions trong ocelot.json
builder.Services.AddAuthorization(options =>
{
    // Cho phép anonymous mặc định - Ocelot sẽ quyết định routes nào cần authentication
    options.FallbackPolicy = null;
});

// ============================================================
// 🧩 3️⃣ CORS (cho phép FE gọi Gateway trực tiếp)
// ============================================================
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy
            .SetIsOriginAllowed(origin => 
            {
                // Allow null origin (file:// protocol)
                if (string.IsNullOrEmpty(origin) || origin == "null")
                    return true;
                
                // Allow localhost and 127.0.0.1 with any port
                try
                {
                    var uri = new Uri(origin);
                    var isAllowed = uri.Host == "localhost" || 
                                   uri.Host == "127.0.0.1" || 
                                   uri.Host == "::1" ||
                                   origin.StartsWith("https://localhost") ||
                                   origin.StartsWith("http://localhost") ||
                                   origin.StartsWith("http://127.0.0.1");
                    
                    Console.WriteLine($"[CORS] Origin: {origin}, Allowed: {isAllowed}");
                    return isAllowed;
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[CORS] Error parsing origin {origin}: {ex.Message}");
                    return false;
                }
            })
            .AllowAnyHeader()
            .AllowAnyMethod()
            .SetPreflightMaxAge(TimeSpan.FromSeconds(3600));
            // Note: Can't use AllowCredentials() with SetIsOriginAllowed
            // If you need credentials, use WithOrigins() instead
    });
});

// Old CORS config (commented out for reference)

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy
            .WithOrigins(
                "http://127.0.0.1:5500",
                "http://localhost:5500",
                "https://localhost:5500",
                "http://127.0.0.1:5501",   // ✅ Live Server port 5501
                "http://localhost:5501",   // ✅ Live Server port 5501
                "https://localhost:5501",  // ✅ Live Server port 5501
                "http://127.0.0.1:3000",   // ✅ Live Server port 3000
                "http://localhost:3000",   // ✅ Live Server port 3000
                "https://localhost:3000"   // ✅ Live Server port 3000
            )
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

// ============================================================
// 🧩 4️⃣ Đăng ký Ocelot
// ============================================================
builder.Services.AddOcelot(builder.Configuration);

// ============================================================
// 🧩 5️⃣ Build app
// ============================================================
var app = builder.Build();

// ============================================================
// 🚀 6️⃣ Middleware Pipeline
// ============================================================

// ============================================================
// 🧩 7️⃣ Static Files – phục vụ ảnh avatar (TRƯỚC OCELOT!)
// ============================================================
var projectRoot = Directory.GetParent(Directory.GetCurrentDirectory())?.FullName;
var avatarFolder = Path.Combine(projectRoot!, "Avatar_User");

// ✅ Đảm bảo thư mục tồn tại
if (!Directory.Exists(avatarFolder))
{
    Directory.CreateDirectory(avatarFolder);
    Console.ForegroundColor = ConsoleColor.Yellow;
    Console.WriteLine($"⚠️ Created Avatar_User folder at: {avatarFolder}");
    Console.ResetColor();
}

Console.ForegroundColor = ConsoleColor.Cyan;
Console.WriteLine($"🖼️ Static avatars will be served from: {avatarFolder}");
Console.WriteLine($"📂 Files in Avatar_User:");
if (Directory.Exists(avatarFolder))
{
    foreach (var file in Directory.GetFiles(avatarFolder))
    {
        Console.WriteLine($"   - {Path.GetFileName(file)}");
    }
}
Console.ResetColor();

// 🔹 Log tất cả request qua Gateway (TẮT LOG AVATAR để tránh spam)
app.Use(async (context, next) =>
{
    var path = context.Request.Path.Value ?? "";
    
    // Chỉ log các request KHÔNG PHẢI avatar để tránh spam log
    if (!context.Request.Path.StartsWithSegments("/avatars"))
    {
        Console.ForegroundColor = ConsoleColor.Cyan;
        Console.WriteLine($"[Gateway] [{DateTime.Now:HH:mm:ss}] {context.Request.Method} {path}");
        Console.WriteLine($"[Gateway] Has Authorization Header: {context.Request.Headers.ContainsKey("Authorization")}");
        Console.ResetColor();
    }

    await next();
    
    // Log response
    if (!path.StartsWith("/avatars"))
    {
        Console.ForegroundColor = ConsoleColor.Cyan;
        Console.WriteLine($"[Gateway] Response: {context.Response.StatusCode} for {path}");
        Console.ResetColor();
    }
});

// ⚠️ QUAN TRỌNG: CORS phải được gọi TRƯỚC tất cả middleware khác
app.UseCors("AllowAll");

// 🔹 Middleware để log CORS headers (debug)
app.Use(async (context, next) =>
{
    var origin = context.Request.Headers["Origin"].ToString();
    if (!string.IsNullOrEmpty(origin))
    {
        Console.ForegroundColor = ConsoleColor.Yellow;
        Console.WriteLine($"[CORS] Request Origin: {origin}");
        Console.ResetColor();
    }
    
    await next();
    
    // Log CORS headers trong response
    if (context.Response.Headers.ContainsKey("Access-Control-Allow-Origin"))
    {
        Console.ForegroundColor = ConsoleColor.Green;
        Console.WriteLine($"[CORS] Response CORS Headers:");
        Console.WriteLine($"  Access-Control-Allow-Origin: {context.Response.Headers["Access-Control-Allow-Origin"]}");
        Console.ResetColor();
    }
    else
    {
        Console.ForegroundColor = ConsoleColor.Red;
        Console.WriteLine($"[CORS] ⚠️ No CORS headers in response!");
        Console.ResetColor();
    }
});

// ⚙️ Static file middleware - MUST BE BEFORE Ocelot
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(avatarFolder),
    RequestPath = "/avatars",
    OnPrepareResponse = ctx =>
    {
        // Set cache headers
        ctx.Context.Response.Headers["Cache-Control"] = "public,max-age=86400";
    }
});

// ✅ QUAN TRỌNG: Gateway authentication middleware
// Authentication ở Gateway chỉ để validate token cho các protected routes
// Routes không có AuthenticationOptions trong ocelot.json sẽ được Ocelot xử lý
app.UseAuthentication();
app.UseAuthorization();

// 🔹 Middleware để xử lý CORS OPTIONS request TRƯỚC Ocelot
app.Use(async (context, next) =>
{
    // Handle preflight OPTIONS request
    if (context.Request.Method == "OPTIONS")
    {
        var origin = context.Request.Headers["Origin"].ToString();
        Console.ForegroundColor = ConsoleColor.Cyan;
        Console.WriteLine($"[CORS Preflight] OPTIONS request from origin: {origin}");
        Console.ResetColor();
        
        if (!string.IsNullOrEmpty(origin))
        {
            context.Response.Headers["Access-Control-Allow-Origin"] = origin;
            context.Response.Headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS";
            context.Response.Headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization";
            context.Response.Headers["Access-Control-Max-Age"] = "3600";
            context.Response.StatusCode = 204;
            
            Console.ForegroundColor = ConsoleColor.Green;
            Console.WriteLine($"[CORS Preflight] ✅ CORS headers set, returning 204");
            Console.ResetColor();
            
            await context.Response.CompleteAsync();
            return;
        }
    }
    
    await next();
});

// ✅ DEBUG: Log sau authentication/authorization để xem request có bị chặn không
app.Use(async (context, next) =>
{
    var path = context.Request.Path.Value ?? "";
    
    // Chỉ log auth routes để debug
    if (path.StartsWith("/api-edu/auth"))
    {
        var isAuthenticated = context.User?.Identity?.IsAuthenticated ?? false;
        
        Console.ForegroundColor = ConsoleColor.Magenta;
        Console.WriteLine($"[Gateway After Auth] Path: {path}");
        Console.WriteLine($"[Gateway After Auth] IsAuthenticated: {isAuthenticated}");
        Console.WriteLine($"[Gateway After Auth] User: {context.User?.Identity?.Name ?? "null"}");
        Console.ResetColor();
    }
    
    await next();
});

// ============================================================
// 🧩 8️⃣ Middleware để thêm CORS headers TRƯỚC Ocelot
// ============================================================
// QUAN TRỌNG: Sử dụng OnStarting callback để thêm CORS headers
// TRƯỚC KHI response bắt đầu được gửi đi
app.Use(async (context, next) =>
{
    // ✅ Đăng ký callback để thêm CORS headers TRƯỚC KHI response bắt đầu
    // Điều này đảm bảo headers được thêm vào đúng thời điểm
    context.Response.OnStarting(() =>
    {
        // Đảm bảo CORS headers có trong response (nếu chưa có)
        // Ocelot có thể không forward CORS headers từ downstream service
        if (!context.Response.Headers.ContainsKey("Access-Control-Allow-Origin"))
        {
            var origin = context.Request.Headers["Origin"].ToString();
            if (!string.IsNullOrEmpty(origin))
            {
                context.Response.Headers["Access-Control-Allow-Origin"] = origin;
                context.Response.Headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS";
                context.Response.Headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization";
                
                Console.ForegroundColor = ConsoleColor.Green;
                Console.WriteLine($"[CORS] ✅ Added CORS headers to response for origin: {origin}");
                Console.ResetColor();
            }
            else
            {
                // Nếu không có Origin header, cho phép tất cả (cho development)
                context.Response.Headers["Access-Control-Allow-Origin"] = "*";
                context.Response.Headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS";
                context.Response.Headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization";
                
                Console.ForegroundColor = ConsoleColor.Yellow;
                Console.WriteLine($"[CORS] ✅ Added CORS headers (wildcard) - no Origin header");
                Console.ResetColor();
            }
        }
        else
        {
            Console.ForegroundColor = ConsoleColor.Green;
            Console.WriteLine($"[CORS] ✅ CORS headers already present");
            Console.ResetColor();
        }
        
        return Task.CompletedTask;
    });
    
    await next();
});

// ============================================================
// 🧩 9️⃣ Ocelot Middleware
// ============================================================
await app.UseOcelot();

// ============================================================
// ✅ 9️⃣ Run
// ============================================================
Console.ForegroundColor = ConsoleColor.Green;
Console.WriteLine("🚀 Gateway started at https://localhost:7033");
Console.ResetColor();

app.Run();