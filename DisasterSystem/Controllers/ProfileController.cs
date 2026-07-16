using System.Security.Claims;
using DisasterSystem.API.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using DisasterSystem.API.DTOs;

namespace DisasterSystem.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ProfileController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public ProfileController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpPost("upload-photo")]
    public async Task<IActionResult> UploadPhoto(IFormFile photo)
    {
        if (photo == null || photo.Length == 0)
            return BadRequest("No photo uploaded");

        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        var user = await _context.Users.FindAsync(userId);

        if (user == null)
            return NotFound("User not found");

        using var memoryStream = new MemoryStream();
        await photo.CopyToAsync(memoryStream);

        user.PhotoBytes = memoryStream.ToArray();
        user.PhotoContentType = photo.ContentType;
        user.PhotoUrl = $"/api/Profile/photo/{user.Id}";

        await _context.SaveChangesAsync();

        return Ok(new
        {
            photoUrl = user.PhotoUrl
        });
    }

    [HttpGet("me")]
    public async Task<IActionResult> GetMyProfile()
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        var user = await _context.Users
            .Where(u => u.Id == userId)
            .Select(u => new
            {
                userId = u.Id,
                name = u.Name,
                email = u.Email,
                role = u.Role,
                photoUrl = u.PhotoUrl
            })
            .FirstOrDefaultAsync();

        if (user == null)
            return NotFound("User not found");

        return Ok(user);
    }

    [AllowAnonymous]
    [HttpGet("photo/{userId}")]
    public async Task<IActionResult> GetProfilePhoto(int userId)
    {
        var user = await _context.Users.FindAsync(userId);

        if (user == null || user.PhotoBytes == null || user.PhotoBytes.Length == 0)
            return NotFound();

        return File(
            user.PhotoBytes,
            user.PhotoContentType ?? "image/jpeg"
        );
    }

    [HttpPut("change-password")]
    public async Task<IActionResult> ChangePassword(
    [FromBody] ChangePasswordDto dto)
    {
        var userIdClaim =
            User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        if (string.IsNullOrWhiteSpace(userIdClaim))
            return Unauthorized("Invalid token.");

        if (!int.TryParse(userIdClaim, out var userId))
            return Unauthorized("Invalid token.");

        if (string.IsNullOrWhiteSpace(dto.CurrentPassword))
            return BadRequest("Current password is required.");

        if (string.IsNullOrWhiteSpace(dto.NewPassword))
            return BadRequest("New password is required.");

        if (dto.NewPassword.Length < 6)
            return BadRequest(
                "New password must contain at least 6 characters."
            );

        if (dto.NewPassword != dto.ConfirmNewPassword)
            return BadRequest(
                "New password and confirmation do not match."
            );

        if (dto.CurrentPassword == dto.NewPassword)
            return BadRequest(
                "New password must be different from the current password."
            );

        var user = await _context.Users.FindAsync(userId);

        if (user == null)
            return NotFound("User not found.");

        if (user.IsBanned)
            return Unauthorized("Your account has been banned.");

        if (string.IsNullOrWhiteSpace(user.Password) ||
            !user.Password.StartsWith("$2"))
        {
            return BadRequest(
                "This account uses an unsupported password format."
            );
        }

        var currentPasswordIsCorrect =
            BCrypt.Net.BCrypt.Verify(
                dto.CurrentPassword,
                user.Password
            );

        if (!currentPasswordIsCorrect)
            return BadRequest("Current password is incorrect.");

        user.Password =
            BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);

        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Password changed successfully."
        });
    }
}