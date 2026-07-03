using System.Security.Claims;
using DisasterSystem.API.Data;
using DisasterSystem.API.DTOs;
using DisasterSystem.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DisasterSystem.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class VotesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public VotesController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpPost]
        public async Task<IActionResult> Vote(CreateVoteDto dto)
        {
            if (dto.Vote != 1 && dto.Vote != -1)
                return BadRequest("Vote must be 1 or -1.");

            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrWhiteSpace(userIdClaim))
                return Unauthorized("Invalid token.");

            var userId = int.Parse(userIdClaim);

            var report = await _context.Reports
                .FirstOrDefaultAsync(x => x.Id == dto.ReportId);

            if (report == null)
                return BadRequest("Report not found.");

            if (report.UserId == userId)
                return BadRequest("You cannot vote on your own report.");

            var existingVote = await _context.ReportVotes
                .FirstOrDefaultAsync(x => x.UserId == userId && x.ReportId == dto.ReportId);

            if (existingVote != null)
                return BadRequest("User already voted on this report.");

            var vote = new ReportVote
            {
                UserId = userId,
                ReportId = dto.ReportId,
                Vote = dto.Vote,
                CreatedAt = DateTime.UtcNow
            };

            _context.ReportVotes.Add(vote);

            report.Score += dto.Vote;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Vote added successfully",
                report.Id,
                report.Score
            });
        }
    }
}