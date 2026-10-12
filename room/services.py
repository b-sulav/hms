def create_room(room_no: int, room_type: str) -> Room:
    Room.objects.create(
        room_no=room_no,
        room_type=room_type,
        status=Available
    )

def create_roomtype(name:str, capacity:int, price:float) -> RoomType:
    RoomType.objects.create(
        name=name,
        capacity=capacity,
        price=price,
    )