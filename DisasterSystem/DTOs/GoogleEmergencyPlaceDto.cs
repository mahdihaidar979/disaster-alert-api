namespace DisasterSystem.API.DTOs
{
    public class GoogleEmergencyPlaceDto
    {
        public string Name { get; set; } = "";
        public string Address { get; set; } = "";
        public string Type { get; set; } = "";
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public double DistanceKm { get; set; }
    }
}