using NetTopologySuite.Geometries;

namespace DisasterSystem.API.Models
{
    public class Report
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string Type { get; set; } = string.Empty;
        public string? Description { get; set; }
        public Point Location { get; set; } = default!;
        public int Severity { get; set; } = 1;
        public double Score { get; set; } = 0;

        public double AiConfidence { get; set; } = 0;
        public string AiPrediction { get; set; } = "Unknown";
        public string AiReason { get; set; } = "";

        public string Status { get; set; } = "Pending";
        public string? ImageUrl { get; set; }
        public DateTime CreatedAt { get; set; }

        public User? User { get; set; }
        public List<ReportVote> ReportVotes { get; set; } = new();
    }
}