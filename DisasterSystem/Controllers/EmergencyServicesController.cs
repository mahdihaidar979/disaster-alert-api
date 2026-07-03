using System.Text.Json;
using DisasterSystem.API.DTOs;
using Microsoft.AspNetCore.Mvc;

namespace DisasterSystem.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class EmergencyServicesController : ControllerBase
    {
        private readonly IConfiguration _configuration;
        private readonly HttpClient _httpClient;

        public EmergencyServicesController(
            IConfiguration configuration,
            IHttpClientFactory httpClientFactory)
        {
            _configuration = configuration;
            _httpClient = httpClientFactory.CreateClient();
        }

        private static double GetDistanceKm(
            double lat1,
            double lon1,
            double lat2,
            double lon2)
        {
            const double earthRadiusKm = 6371;

            double dLat = (lat2 - lat1) * Math.PI / 180;
            double dLon = (lon2 - lon1) * Math.PI / 180;

            double a =
                Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(lat1 * Math.PI / 180) *
                Math.Cos(lat2 * Math.PI / 180) *
                Math.Sin(dLon / 2) *
                Math.Sin(dLon / 2);

            double c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));

            return earthRadiusKm * c;
        }

        private static string ConvertType(string type)
        {
            return type switch
            {
                "Hospital" => "hospital",
                "Police" => "police",
                "Fire Station" => "fire_station",
                "Shelter" => "local_government_office",
                _ => "hospital"
            };
        }

        [HttpGet("google-nearby")]
        public async Task<IActionResult> GetGoogleNearby(
            [FromQuery] double latitude,
            [FromQuery] double longitude,
            [FromQuery] string type = "Hospital")
        {
            var apiKey = _configuration["GoogleMaps:ApiKey"];

            if (string.IsNullOrWhiteSpace(apiKey))
                return BadRequest("Google Places API key is missing.");

            var googleType = ConvertType(type);

            var url =
                "https://maps.googleapis.com/maps/api/place/nearbysearch/json" +
                $"?location={latitude},{longitude}" +
                $"&radius=5000" +
                $"&type={googleType}" +
                $"&key={apiKey}";

            var response = await _httpClient.GetAsync(url);
            var json = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
                return StatusCode((int)response.StatusCode, json);

            using var doc = JsonDocument.Parse(json);

            var results = doc.RootElement
                .GetProperty("results")
                .EnumerateArray()
                .Take(10)
                .Select(place =>
                {
                    var location = place
                        .GetProperty("geometry")
                        .GetProperty("location");

                    var placeLat = location.GetProperty("lat").GetDouble();
                    var placeLng = location.GetProperty("lng").GetDouble();

                    return new GoogleEmergencyPlaceDto
                    {
                        Name = place.GetProperty("name").GetString() ?? "",
                        Address = place.TryGetProperty("vicinity", out var address)
                            ? address.GetString() ?? ""
                            : "",
                        Type = type,
                        Latitude = placeLat,
                        Longitude = placeLng,
                        DistanceKm = Math.Round(
                            GetDistanceKm(
                                latitude,
                                longitude,
                                placeLat,
                                placeLng),
                            2)
                    };
                })
                .OrderBy(x => x.DistanceKm)
                .ToList();

            return Ok(results);
        }
    }
}