def check_allocation_needs(
    bus_id: str,
    route_id: str,
    passenger_count: int,
    capacity: int,
    speed: float
):
    """
    Intelligent rule engine to suggest administrative actions
    such as deploying spare buses or rerouting traffic.
    """

    alerts = []

    # -------------------------------------------------
    # RULE 1: OVERCROWDING (More than 90% capacity)
    # -------------------------------------------------
    if capacity > 0:
        occupancy = (passenger_count / capacity) * 100

        if occupancy > 90:
            print(
                f"🚨 CROWD ALERT: Bus {bus_id} "
                f"({passenger_count}/{capacity}, {int(occupancy)}%)"
            )

            alerts.append({
                "type": "CROWD_SURGE",
                "level": "CRITICAL",
                "bus_id": bus_id,
                "route_id": route_id,
                "message": (
                    f"Bus {bus_id} is {int(occupancy)}% full "
                    f"({passenger_count}/{capacity}). "
                    f"Deploy a spare bus on Route {route_id}."
                )
            })

    # -------------------------------------------------
    # RULE 2: STALLED / BREAKDOWN / HEAVY CONGESTION
    # -------------------------------------------------
    if speed < 2:
        print(f"⚠️ STALLED ALERT: Bus {bus_id} speed={speed} km/h")

        alerts.append({
            "type": "STALLED",
            "level": "WARNING",
            "bus_id": bus_id,
            "route_id": route_id,
            "message": (
                f"Bus {bus_id} speed dropped below 2 km/h. "
                f"Consider rerouting or dispatching support."
            )
        })

    return alerts
