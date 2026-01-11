export async function createRoom(title) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE}/room`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    }
  );

  if (!res.ok) {
    throw new Error("Failed to create room");
  }

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
