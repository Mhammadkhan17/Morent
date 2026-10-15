export async function POST(request) {
  try {
    const rentalData = await request.json();
    // Persist to your database here (e.g. the backend/ service)
    console.log("Rental data received:", rentalData);
    return Response.json({ success: true, data: rentalData });
  } catch (error) {
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
