namespace DisasterSystem.API.DTOs
{
    public class CreateVoteDto
    {
        public int ReportId { get; set; }
        public int Vote { get; set; } // 1 or -1
    }
}