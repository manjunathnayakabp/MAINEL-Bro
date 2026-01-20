def calculate_delay_status(speed: float, traffic_level: int):
    """
    Decides the bus status based on Traffic and Speed.
    Returns: (Status Text, Color Code)
    """
    # 1. High Traffic & Low Speed = Severe Delay (Red)
    if traffic_level > 80:
        return "SEVERE DELAY", "red"
    
    # 2. Moderate Traffic = Moderate Delay (Orange)
    elif traffic_level > 50:
        return "MODERATE DELAY", "orange"
        
    # 3. Low Traffic = On Time (Green)
    else:
        return "ON TIME", "green"