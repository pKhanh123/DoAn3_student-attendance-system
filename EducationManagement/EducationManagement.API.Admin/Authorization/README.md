# 🔐 Permission-Based Authorization

## 📋 Tổng Quan

Hệ thống sử dụng **Permission-Based Authorization** thay vì hardcode roles trong code. Điều này cho phép:
- ✅ Quản lý phân quyền từ **database** mà không cần sửa code
- ✅ Linh hoạt thay đổi quyền của role mà không cần rebuild
- ✅ Dễ dàng thêm/sửa/xóa permissions

## 🎯 Cách Sử Dụng

### 1. Sử dụng `[RequirePermission]` cho một permission

```csharp
[HttpGet]
[RequirePermission("ADMIN_ACADEMIC_YEARS")]
public async Task<IActionResult> GetAll()
{
    // Chỉ user có permission ADMIN_ACADEMIC_YEARS mới được truy cập
}
```

### 2. Sử dụng `[RequireAnyPermission]` cho nhiều permissions (OR logic)

```csharp
[HttpGet]
[RequireAnyPermission("ADMIN_ACADEMIC_YEARS", "VIEW_ACADEMIC_YEARS")]
public async Task<IActionResult> GetAll()
{
    // User có MỘT TRONG các permissions trên sẽ được truy cập
}
```

### 3. Kết hợp với `[Authorize]` để yêu cầu authentication

```csharp
[ApiController]
[Authorize] // Yêu cầu đăng nhập
[Route("api-edu/academic-years")]
public class AcademicYearController : ControllerBase
{
    [HttpGet]
    [RequirePermission("ADMIN_ACADEMIC_YEARS")] // Yêu cầu permission cụ thể
    public async Task<IActionResult> GetAll()
    {
        // ...
    }
}
```

## 📊 Permission Codes

Permission codes được định nghĩa trong bảng `permissions` trong database. Ví dụ:
- `ADMIN_ACADEMIC_YEARS` - Quản lý niên khóa
- `ADMIN_REGISTRATION_PERIODS` - Quản lý đợt đăng ký
- `ADMIN_ENROLLMENTS` - Quản lý đăng ký học phần
- `ADMIN_AUDIT_LOGS` - Xem nhật ký hệ thống

## 🔄 Migration từ Role-Based sang Permission-Based

### Trước (Role-Based - Hardcode):
```csharp
[Authorize(Roles = "Admin,Student,Lecturer,Advisor")]
```

### Sau (Permission-Based - Database):
```csharp
[RequirePermission("ADMIN_ACADEMIC_YEARS")]
```

## ⚙️ Cách Hoạt Động

1. User đăng nhập → JWT token chứa `role` claim
2. Request đến endpoint có `[RequirePermission]`
3. `PermissionAuthorizationHandler`:
   - Lấy `role` từ JWT token
   - Query database để lấy permissions của role đó
   - Kiểm tra xem role có permission cần thiết không
4. Nếu có → Cho phép truy cập
5. Nếu không → Trả về 403 Forbidden

## 💡 Lợi Ích

1. **Không cần rebuild**: Chỉ cần cập nhật `role_permissions` trong database
2. **Linh hoạt**: Dễ dàng thêm/sửa/xóa permissions cho role
3. **Bảo mật**: Phân quyền được quản lý tập trung trong database
4. **Audit**: Có thể track được ai có quyền gì, khi nào thay đổi

## 📝 Ví Dụ Thực Tế

### AcademicYearController

```csharp
[HttpGet]
[RequirePermission("ADMIN_ACADEMIC_YEARS")] // ✅ Permission từ database
public async Task<IActionResult> GetAll()
{
    // Chỉ role có ADMIN_ACADEMIC_YEARS permission mới được truy cập
    // Hiện tại: Admin và Advisor (vì Advisor đã được gộp với Support)
}
```

### RegistrationPeriodController

```csharp
[HttpGet]
[RequirePermission("ADMIN_REGISTRATION_PERIODS")] // ✅ Permission từ database
public async Task<IActionResult> GetAll()
{
    // Chỉ role có ADMIN_REGISTRATION_PERIODS permission mới được truy cập
}
```

## 🔧 Cấu Hình

Đã được đăng ký trong `Program.cs`:

```csharp
// Register PermissionAuthorizationHandler
builder.Services.AddScoped<IAuthorizationHandler, PermissionAuthorizationHandler>();

// Register PermissionPolicyProvider
builder.Services.AddSingleton<IAuthorizationPolicyProvider, PermissionPolicyProvider>();
```

## 📌 Lưu Ý

- Permission codes phải khớp với `permission_code` trong bảng `permissions`
- Role phải có permission được gán trong bảng `role_permissions`
- Nếu không có permission, user sẽ nhận 403 Forbidden

