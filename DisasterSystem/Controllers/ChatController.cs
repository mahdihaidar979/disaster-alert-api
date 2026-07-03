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
                    x.CreatedAt >= expireTime)
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
                CreatedAt = DateTime.UtcNow
            };

            _context.ChatMessages.Add(message);
            await _context.SaveChangesAsync();

            await _hubContext.Clients.All.SendAsync(
                "ReceiveChatMessage",
                message
            );

            return Ok(message);
        }
    }
}