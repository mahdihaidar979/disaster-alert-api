namespace DisasterSystem.API.DTOs
{
    public class RealRouteResultDto
    {
        public bool IsSafe { get; set; }
        public string Message { get; set; } = string.Empty;

        public double DistanceMeters { get; set; }
        public string Duration { get; set; } = string.Empty;
        public string EncodedPolyline { get; set; } = string.Empty;

        public List<RoutePointDto> RoutePoints { get; set; } = new();
        public List<ZoneAlertDto> IntersectingZones { get; set; } = new();
        public List<ReportAlertDto> NearbyReports { get; set; } = new();
    }

    public class RoutePointDto
    {
        public double Latitude { get; set; }
        public double Longitude { get; set; }
    }

    public class ZoneAlertDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public int Level { get; set; }
    }

    public class ReportAlertDto
    {
        public int Id { get; set; }
        public string Type { get; set; } = string.Empty;
        public string? Description { get; set; }
        public int Severity { get; set; }
        public string Status { get; set; } = string.Empty;
        public double Latitude { get; set; }
        public double Longitude { get; set; }
    }
}