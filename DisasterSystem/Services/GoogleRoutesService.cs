using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using DisasterSystem.API.DTOs;

namespace DisasterSystem.API.Services
{
    public class GoogleRoutesService
    {
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _configuration;

        public GoogleRoutesService(HttpClient httpClient, IConfiguration configuration)
        {
            _httpClient = httpClient;
            _configuration = configuration;
        }

        public async Task<List<GoogleRouteDto>> ComputeRoutesAsync(
            RealRouteRequestDto dto,
            CancellationToken cancellationToken = default)
        {
            var apiKey = _configuration["GoogleMaps:ApiKey"];

            if (string.IsNullOrWhiteSpace(apiKey))
                throw new InvalidOperationException("Google Maps API key is missing.");

            var url = "https://routes.googleapis.com/directions/v2:computeRoutes";

            var requestBody = new
            {
                origin = new
                {
                    location = new
                    {
                        latLng = new
                        {
                            latitude = dto.StartLatitude,
                            longitude = dto.StartLongitude
                        }
                    }
                },
                destination = new
                {
                    location = new
                    {
                        latLng = new
                        {
                            latitude = dto.EndLatitude,
                            longitude = dto.EndLongitude
                        }
                    }
                },
                travelMode = NormalizeTravelMode(dto.TravelMode),
                routingPreference = "TRAFFIC_AWARE",
                computeAlternativeRoutes = dto.SafeMode,
                languageCode = "en-US",
                units = "METRIC"
            };

            using var request = new HttpRequestMessage(HttpMethod.Post, url);

            request.Headers.Add("X-Goog-Api-Key", apiKey);
            request.Headers.Add(
                "X-Goog-FieldMask",
                "routes.distanceMeters,routes.duration,routes.polyline"
            );
            request.Headers.Accept.Add(
                new MediaTypeWithQualityHeaderValue("application/json")
            );

            request.Content = new StringContent(
                JsonSerializer.Serialize(requestBody),
                Encoding.UTF8,
                "application/json"
            );

            using var response = await _httpClient.SendAsync(request, cancellationToken);
            var json = await response.Content.ReadAsStringAsync(cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                throw new InvalidOperationException(
                    $"Google Routes API error: {(int)response.StatusCode} - {json}");
            }

            var parsed = JsonSerializer.Deserialize<GoogleRoutesResponseDto>(
                json,
                new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

            return parsed?.Routes ?? new List<GoogleRouteDto>();
        }

        public async Task<GoogleRouteDto?> ComputeRouteAsync(
            RealRouteRequestDto dto,
            CancellationToken cancellationToken = default)
        {
            var routes = await ComputeRoutesAsync(dto, cancellationToken);
            return routes.FirstOrDefault();
        }

        private static string NormalizeTravelMode(string mode)
        {
            return mode?.Trim().ToUpperInvariant() switch
            {
                "WALK" => "WALK",
                "BICYCLE" => "BICYCLE",
                "TWO_WHEELER" => "TWO_WHEELER",
                _ => "DRIVE"
            };
        }
    }
}