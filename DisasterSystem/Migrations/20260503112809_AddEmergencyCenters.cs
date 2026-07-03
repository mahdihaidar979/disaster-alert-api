using System;
using Microsoft.EntityFrameworkCore.Migrations;
using NetTopologySuite.Geometries;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace DisasterSystem.API.Migrations
{
    /// <inheritdoc />
    public partial class AddEmergencyCenters : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .Annotation("Npgsql:PostgresExtension:postgis", ",,");

            

           

           

           

          

            migrationBuilder.CreateIndex(
                name: "IX_notifications_userid",
                table: "notifications",
                column: "userid");

            migrationBuilder.CreateIndex(
                name: "IX_reports_userid",
                table: "reports",
                column: "userid");

            migrationBuilder.CreateIndex(
                name: "IX_reportvotes_reportid",
                table: "reportvotes",
                column: "reportid");

            migrationBuilder.CreateIndex(
                name: "IX_reportvotes_userid",
                table: "reportvotes",
                column: "userid");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
           
           
        }
    }
}
