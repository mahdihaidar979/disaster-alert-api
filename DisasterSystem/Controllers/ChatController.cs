using System.Security.Claims;
using DisasterSystem.API.Data;
using DisasterSystem.API.DTOs;
using DisasterSystem.API.Hubs;
using DisasterSystem.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace DisasterSystem.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ChatController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IHubContext<ChatHub> _hubContext;

        public ChatController(
            ApplicationDbContext context,
            IHubContext<ChatHub> hubContext)
        {
            _context = context;
            _hubContext = hubContext;
        }

        [HttpGet("messages")]
        public async Task<IActionResult> GetMessages(
            [FromQuery] string channel = "General")
        {
            var expireTime = DateTime.UtcNow.AddHours(-24);

            await _context.ChatMessages
                .Where(x => x.CreatedAt < expireTime)
                .ExecuteDeleteAsync();

            var messages = await _context.ChatMessages
                .AsNoTracking()
               .Where(x =>
    x.Channel == channel &&
    x.CreatedAt >= expireTime &&
    !x.IsDeleted)

                .OrderByDescending(x => x.CreatedAt)
                .Take(100)
                .OrderBy(x => x.CreatedAt)
                .ToListAsync();

            return Ok(messages);
        }

        [HttpPost("send")]
        public async Task<IActionResult> SendMessage(SendChatMessageDto dto)
        {
            var userIdClaim =
                User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            var userName =
                User.FindFirst(ClaimTypes.Name)?.Value ?? "User";

            var role = User.FindFirst(ClaimTypes.Role)?.Value ?? "User";

            if (string.IsNullOrWhiteSpace(userIdClaim))
                return Unauthorized("Invalid token.");

            if (string.IsNullOrWhiteSpace(dto.Message))
                return BadRequest("Message is required.");

            if (dto.Message.Length > 500)
                return BadRequest("Message is too long.");

            var channel = string.IsNullOrWhiteSpace(dto.Channel)
                ? "General"
                : dto.Channel.Trim();

            var message = new ChatMessage
            {
                UserId = int.Parse(userIdClaim),
                UserName = userName,
                Message = dto.Message.Trim(),
                Channel = channel,
                CreatedAt = DateTime.UtcNow,
                IsAdminMessage = role == "Admin",
                IsDeleted = false,
                IsPinned = false
            };

            _context.ChatMessages.Add(message);
            await _context.SaveChangesAsync();

            await _hubContext.Clients.All.SendAsync(
                "ReceiveChatMessage",
                message
            );

            return Ok(message);
        }

        [Authorize(Roles = "Admin")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteMessage(int id)
        {
            var message = await _context.ChatMessages.FindAsync(id);

            if (message == null)
                return NotFound("Message not found.");

            message.IsDeleted = true;

            await _context.SaveChangesAsync();

            await _hubContext.Clients.All.SendAsync("ChatMessageDeleted", id);

            return Ok(new { message = "Message deleted successfully" });
        }

        [Authorize(Roles = "Admin")]
        [HttpPut("{id}/pin")]
        public async Task<IActionResult> TogglePinMessage(int id)
        {
            var message = await _context.ChatMessages.FindAsync(id);

            if (message == null)
                return NotFound("Message not found.");

            message.IsPinned = !message.IsPinned;

            await _context.SaveChangesAsync();

            await _hubContext.Clients.All.SendAsync("ChatMessagePinned", message);

            return Ok(message);
        }

        [Authorize(Roles = "Admin")]
        [HttpPost("admin-warning")]
        public async Task<IActionResult> SendAdminWarning(SendChatMessageDto dto)
        {
            var adminId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var adminName = User.FindFirst(ClaimTypes.Name)?.Value ?? "Admin";

            if (string.IsNullOrWhiteSpace(adminId))
                return Unauthorized("Invalid token.");

            if (string.IsNullOrWhiteSpace(dto.Message))
                return BadRequest("Message is required.");

            var channel = string.IsNullOrWhiteSpace(dto.Channel)
                ? "general"
                : dto.Channel.Trim();

            var message = new ChatMessage
            {
                UserId = int.Parse(adminId),
                UserName = adminName,
                Message = dto.Message.Trim(),
                Channel = channel,
                CreatedAt = DateTime.UtcNow,
                IsAdminMessage = true,
                IsDeleted = false,
                IsPinned = true
            };

            _context.ChatMessages.Add(message);
            await _context.SaveChangesAsync();

            await _hubContext.Clients.All.SendAsync("ReceiveChatMessage", message);

            return Ok(message);
        }
    }

}