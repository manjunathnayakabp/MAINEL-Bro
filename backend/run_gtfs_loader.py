from app.adapters.gtfs_loader import load_gtfs

if __name__ == "__main__":
    load_gtfs("gtfs_data")
    print("GTFS data loaded successfully")
