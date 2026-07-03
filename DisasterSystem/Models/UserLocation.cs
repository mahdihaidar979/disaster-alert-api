using DisasterSystem.API.Models;

public class UserLocation
{
    public int Id { get; set; }

    public int UserId { get; set; }

    public double Latitude { get; set; }

    public double Longitude { get; set; }

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
}