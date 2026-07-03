namespace DisasterSystem.API.DTOs
{
    public class CreateEmergencyCenterDto
    {
        public string Name { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public bool IsAvailable { get; set; } = true;

        public double Latitude { get; set; }
        public double Longitude { get; set; }
    }
}