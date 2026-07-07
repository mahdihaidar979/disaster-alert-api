using System.Security.Claims;
using DisasterSystem.API.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

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
}