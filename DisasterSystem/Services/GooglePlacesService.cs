using System.Text.Json;

namespace DisasterSystem.API.Services
{
    public class GooglePlacesService
    {
        private readonly HttpClient _http;
        private readonly IConfiguration _config;

        public GooglePlacesService(HttpClient http, IConfiguration config)
        {
            _http = http;
            _config = config;
        }

        public async Task<List<object>> GetNearbyPlaces(
            double lat,
            double lng,
            string type)
        {
            var apiKey = _config["GoogleMaps:ApiKey"];

            var url =
                $"https://maps.googleapis.com/maps/api/place/nearbysearch/json?" +
                $"location={lat},{lng}&radius=50000&type={type}&key={apiKey}";

            return await FetchPlaces(url, type);
        }

        public async Task<List<object>> GetAllHospitalsInLebanon()
        {
            return await GetAllPlacesInLebanon("hospital");
        }

        public async Task<List<object>> GetAllPoliceInLebanon()
        {
            return await GetAllPlacesInLebanon("police");
        }

        public async Task<List<object>> GetAllFireStationsInLebanon()
        {
            return await GetAllPlacesInLebanon("fire_station");
        }

        private async Task<List<object>> GetAllPlacesInLebanon(string type)
        {
            var apiKey = _config["GoogleMaps:ApiKey"];

            var locations = new List<(double lat, double lng)>
            {
                (33.8938, 35.5018), // Beirut
                //(34.4367, 35.8497), // Tripoli
                //(33.5570, 35.3750), // Saida
                //(33.2704, 35.2038), // South / Sidon area
                //(33.1190, 35.4310), // Tyre
                //(33.3789, 35.4830), // Nabatieh
                //(33.8462, 35.9020), // Zahle
                (34.0058, 36.2181), // Baalbek
                //(34.1230, 36.0780), // Hermel area
                //(34.2500, 35.6500), // Byblos / Jbeil
                //(33.6956, 35.5808), // Chouf
                //(33.8333, 35.5333), // Mount Lebanon
                //(34.5400, 36.0800), // Akkar
                //(33.5631, 35.3689), // Jezzine/South
            };

            var allPlaces = new List<PlaceResultDto>();
            var seenPlaceIds = new HashSet<string>();
            var seenFallbackKeys = new HashSet<string>();

            foreach (var location in locations)
            {
                var url =
                    $"https://maps.googleapis.com/maps/api/place/nearbysearch/json?" +
                    $"location={location.lat},{location.lng}" +
                    $"&radius=50000" +
                    $"&type={type}" +
                    $"&key={apiKey}";

                var places = await FetchPlacesStrong(url, type);

                foreach (var place in places)
                {
                    if (!string.IsNullOrWhiteSpace(place.PlaceId))
                    {
                        if (seenPlaceIds.Add(place.PlaceId))
                            allPlaces.Add(place);
                    }
                    else
                    {
                        var key =
                            $"{place.Name.ToLowerInvariant().Trim()}_" +
                            $"{Math.Round(place.Lat, 4)}_" +
                            $"{Math.Round(place.Lng, 4)}";

                        if (seenFallbackKeys.Add(key))
                            allPlaces.Add(place);
                    }
                }
            }

            return allPlaces
                .OrderBy(p => p.Name)
                .Select(p => new
                {
                    name = p.Name,
                    lat = p.Lat,
                    lng = p.Lng,
                    type = p.Type,
                    phone = "",
                    address = p.Address
                })
                .Cast<object>()
                .ToList();
        }

        private async Task<List<object>> FetchPlaces(string url, string type)
        {
            var places = await FetchPlacesStrong(url, type);

            return places
                .Select(p => new
                {
                    name = p.Name,
                    lat = p.Lat,
                    lng = p.Lng,
                    type = p.Type,
                    phone = "",
                    address = p.Address
                })
                .Cast<object>()
                .ToList();
        }

        private async Task<List<PlaceResultDto>> FetchPlacesStrong(string url, string type)
        {
            var response = await _http.GetStringAsync(url);
            using var json = JsonDocument.Parse(response);

            var status = json.RootElement.GetProperty("status").GetString();

            if (status != "OK" && status != "ZERO_RESULTS")
            {
                var errorMessage = json.RootElement.TryGetProperty("error_message", out var error)
                    ? error.GetString()
                    : "No error_message returned";

                throw new Exception($"Google API error: {status} - {errorMessage}");
            }

            var list = new List<PlaceResultDto>();

            if (!json.RootElement.TryGetProperty("results", out var results))
                return list;

            foreach (var r in results.EnumerateArray())
            {
                var name = r.TryGetProperty("name", out var nameProp)
                    ? nameProp.GetString() ?? ""
                    : "";

                var placeId = r.TryGetProperty("place_id", out var placeIdProp)
                    ? placeIdProp.GetString() ?? ""
                    : "";

                var location = r
                    .GetProperty("geometry")
                    .GetProperty("location");

                var address = r.TryGetProperty("vicinity", out var vicinityProp)
    ? vicinityProp.GetString() ?? ""
    : "";

                list.Add(new PlaceResultDto
                {
                    Name = name,
                    PlaceId = placeId,
                    Lat = location.GetProperty("lat").GetDouble(),
                    Lng = location.GetProperty("lng").GetDouble(),
                    Type = type,
                    Address = address
                });
            }

            return list;
        }

        private class PlaceResultDto
        {
            public string Name { get; set; } = string.Empty;
            public string PlaceId { get; set; } = string.Empty;
            public double Lat { get; set; }
            public double Lng { get; set; }
            public string Type { get; set; } = string.Empty;
            public string Address { get; set; } = string.Empty;
        }
    }
}