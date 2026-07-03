namespace DisasterSystem.API.Models
{
    public class ReportVote
    {
        public int Id { get; set; }

        public int ReportId { get; set; }
        public Report Report { get; set; } = default!;

        public int UserId { get; set; }
        public User User { get; set; } = default!;

        public int Vote { get; set; } // 1 = confirm, -1 = reject

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}