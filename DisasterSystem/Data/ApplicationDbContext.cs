using DisasterSystem.API.Models;
using Microsoft.EntityFrameworkCore;

namespace DisasterSystem.API.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        public DbSet<User> Users => Set<User>();
        public DbSet<Report> Reports => Set<Report>();
        public DbSet<ReportVote> ReportVotes => Set<ReportVote>();
        public DbSet<DangerZone> DangerZones => Set<DangerZone>();
        public DbSet<Notification> Notifications => Set<Notification>();
        public DbSet<EmergencyCenter> EmergencyCenters => Set<EmergencyCenter>();
        public DbSet<UserLocation> UserLocations => Set<UserLocation>();
        public DbSet<AdminLog> AdminLogs => Set<AdminLog>();
        public DbSet<UserLocation> UserLocation => Set<UserLocation>();
        public DbSet<SafetyCheckIn> SafetyCheckIns => Set<SafetyCheckIn>();
        public DbSet<ChatMessage> ChatMessages { get; set; }
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<User>(entity =>
            {
                entity.ToTable("users");

                entity.HasKey(x => x.Id);

                entity.Property(x => x.Id).HasColumnName("id");
                entity.Property(x => x.Name).HasColumnName("name");
                entity.Property(x => x.Email).HasColumnName("email");
                entity.Property(x => x.Password).HasColumnName("password");
                entity.Property(x => x.Role).HasColumnName("role");
                entity.Property(x => x.Reputation).HasColumnName("reputation");
                entity.Property(x => x.CreatedAt).HasColumnName("createdat");
                entity.Property(x => x.Latitude).HasColumnName("latitude");
                entity.Property(x => x.Longitude).HasColumnName("longitude");
                entity.Property(x => x.FcmToken).HasColumnName("fcmtoken");
            });

            modelBuilder.Entity<Report>(entity =>
            {
                entity.ToTable("reports");

                entity.HasKey(x => x.Id);

                entity.Property(x => x.Id).HasColumnName("id");
                entity.Property(x => x.UserId).HasColumnName("userid");
                entity.Property(x => x.Type).HasColumnName("type");
                entity.Property(x => x.Description).HasColumnName("description");
                entity.Property(x => x.Location)
                    .HasColumnName("location")
                    .HasColumnType("geography (point, 4326)");
                entity.Property(x => x.Severity).HasColumnName("severity");
                entity.Property(x => x.Score).HasColumnName("score");
                entity.Property(x => x.Status).HasColumnName("status");
                entity.Property(x => x.CreatedAt).HasColumnName("createdat");
                entity.Property(x => x.ImageUrl).HasColumnName("imageurl");

                entity.HasOne(x => x.User)
                    .WithMany(x => x.Reports)
                    .HasForeignKey(x => x.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<ReportVote>(entity =>
            {
                entity.ToTable("reportvotes");

                entity.HasKey(x => x.Id);

                entity.Property(x => x.Id).HasColumnName("id");
                entity.Property(x => x.UserId).HasColumnName("userid");
                entity.Property(x => x.ReportId).HasColumnName("reportid");
                entity.Property(x => x.Vote).HasColumnName("vote").HasColumnType("integer");
                entity.Property(x => x.CreatedAt).HasColumnName("createdat");

                entity.HasOne(x => x.User)
                    .WithMany(x => x.ReportVotes)
                    .HasForeignKey(x => x.UserId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(x => x.Report)
                    .WithMany(x => x.ReportVotes)
                    .HasForeignKey(x => x.ReportId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<DangerZone>(entity =>
            {
                entity.ToTable("dangerzones");

                entity.HasKey(x => x.Id);

                entity.Property(x => x.Id).HasColumnName("id");
                entity.Property(x => x.Name).HasColumnName("name");
                entity.Property(x => x.Area)
                    .HasColumnName("area")
                    .HasColumnType("geography (polygon, 4326)");
                entity.Property(x => x.Level).HasColumnName("level");
            });

            modelBuilder.Entity<Notification>(entity =>
            {
                entity.ToTable("notifications");

                entity.HasKey(x => x.Id);

                entity.Property(x => x.Id).HasColumnName("id");
                entity.Property(x => x.UserId).HasColumnName("userid");
                entity.Property(x => x.Title).HasColumnName("title");
                entity.Property(x => x.Message).HasColumnName("message");
                entity.Property(x => x.IsRead).HasColumnName("isread");
                entity.Property(x => x.CreatedAt).HasColumnName("createdat");
                entity.Property(x => x.Latitude).HasColumnName("latitude");
                entity.Property(x => x.Longitude).HasColumnName("longitude");

                entity.HasOne(x => x.User)
                    .WithMany(x => x.Notifications)
                    .HasForeignKey(x => x.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<ChatMessage>(entity =>
            {
                entity.ToTable("ChatMessages");

                entity.HasKey(x => x.Id);

                entity.Property(x => x.Id).HasColumnName("Id");
                entity.Property(x => x.UserId).HasColumnName("UserId");
                entity.Property(x => x.UserName).HasColumnName("UserName");
                entity.Property(x => x.Message).HasColumnName("Message");
                entity.Property(x => x.Channel).HasColumnName("Channel");
                entity.Property(x => x.CreatedAt).HasColumnName("CreatedAt");
            });

            modelBuilder.Entity<Report>()
                .Property(r => r.AiConfidence)
                .HasColumnName("aiconfidence");

            modelBuilder.Entity<Report>()
                .Property(r => r.AiPrediction)
                .HasColumnName("aiprediction");

            modelBuilder.Entity<Report>()
                .Property(r => r.AiReason)
                .HasColumnName("aireason");

        }
    }
}