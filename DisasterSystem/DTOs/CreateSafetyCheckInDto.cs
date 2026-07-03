namespace DisasterSystem.API.DTOs
{
    public class CreateSafetyCheckInDto
    {
        public string Status { get; set; } = string.Empty;
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public string? Message { get; set; }
    }
}