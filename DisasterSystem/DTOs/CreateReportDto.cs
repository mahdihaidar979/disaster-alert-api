using Microsoft.AspNetCore.Http;

namespace DisasterSystem.API.DTOs
{
    public class CreateReportDto
    {
        public string Type { get; set; } = string.Empty;
        public string? Description { get; set; }
        public int Severity { get; set; }
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public IFormFile? Image { get; set; }
    }
}