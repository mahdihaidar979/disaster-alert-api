using System.Text.Json.Serialization;

namespace DisasterSystem.API.DTOs
{
    public class GoogleRoutesResponseDto
    {
        [JsonPropertyName("routes")]
        public List<GoogleRouteDto>? Routes { get; set; }
    }

    public class GoogleRouteDto
    {
        [JsonPropertyName("distanceMeters")]
        public int DistanceMeters { get; set; }

        [JsonPropertyName("duration")]
        public string Duration { get; set; } = string.Empty;

        [JsonPropertyName("polyline")]
        public GooglePolylineDto? Polyline { get; set; }
    }

    public class GooglePolylineDto
    {
        [JsonPropertyName("encodedPolyline")]
        public string EncodedPolyline { get; set; } = string.Empty;
    }
}