using DisasterSystem.API.DTOs;

namespace DisasterSystem.API.Services
{
    public class PolylineDecoderService
    {
        public List<RoutePointDto> Decode(string encodedPolyline)
        {
            var poly = new List<RoutePointDto>();
            if (string.IsNullOrWhiteSpace(encodedPolyline))
                return poly;

            int index = 0;
            int lat = 0;
            int lng = 0;

            while (index < encodedPolyline.Length)
            {
                lat += DecodeNextValue(encodedPolyline, ref index);
                lng += DecodeNextValue(encodedPolyline, ref index);

                poly.Add(new RoutePointDto
                {
                    Latitude = lat / 1E5,
                    Longitude = lng / 1E5
                });
            }

            return poly;
        }

        private static int DecodeNextValue(string encoded, ref int index)
        {
            int result = 0;
            int shift = 0;
            int b;

            do
            {
                b = encoded[index++] - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            }
            while (b >= 0x20);

            return (result & 1) != 0 ? ~(result >> 1) : (result >> 1);
        }
    }
}