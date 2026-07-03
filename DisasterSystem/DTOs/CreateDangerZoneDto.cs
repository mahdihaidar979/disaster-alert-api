namespace DisasterSystem.API.DTOs
{
    public class CreateDangerZoneDto
    {
        public string Name { get; set; } = string.Empty;
        public int Level { get; set; }

        // List of coordinates (Polygon)
        public List<CoordinateDto> Coordinates { get; set; } = new();
    }

    public class CoordinateDto
    {
        public double Latitude { get; set; }
        public double Longitude { get; set; }
    }
}