export async function createRoom(title, token) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE}/room`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ title }),
    }
  );

  if (!res.ok) {
    throw new Error("Failed to create room");
  }

  return res.json();
}

export async function getMyRooms(token) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE}/room/my`,
    {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    }
  );

  if (!res.ok) throw new Error("Failed to fetch rooms");
  return res.json();
}

export async function deleteRoom(roomId, token) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE}/room/${roomId}`,
    {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    }
  );

  if (!res.ok) throw new Error("Failed to delete room");
  return res.json();
}

export async function getRoom(roomId) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE}/room/${roomId}`
  );

  if (!res.ok) {
    throw new Error("Room not found");
  }

  return res.json();
}
