const bookNowBtn = document.getElementById("bookNowBtn");
const bookingForm = document.getElementById("bookingForm");
const submitBooking = document.getElementById("submitBooking");
const thankYouMessage = document.getElementById("thankYouMessage");
const formError = document.getElementById("formError");

bookNowBtn.addEventListener("click", () => {
  bookingForm.classList.remove("hidden");
  bookingForm.scrollIntoView({ behavior: "smooth" });
});

submitBooking.addEventListener("click", async () => {
  const fields = [
    document.getElementById("bookingDate"),
    document.getElementById("bookingTime"),
    document.getElementById("name"),
    document.getElementById("contact"),
    document.getElementById("pickup"),
    document.getElementById("destination"),
    document.getElementById("people"),
    document.getElementById("luggage"),
    document.getElementById("childSeat")
  ];

  let valid = true;

  fields.forEach(field => {
    if (!field.value.trim()) {
      field.classList.add("error");
      valid = false;
    } else {
      field.classList.remove("error");
    }
  });

  if (!valid) {
    formError.classList.remove("hidden");
    alert("Please complete all booking details before submitting.");
    return;
  }

  formError.classList.add("hidden");
  submitBooking.textContent = "Sending...";
  submitBooking.disabled = true;

  const bookingData = {
    _subject: "New Moover Taxi Booking",
    Date: document.getElementById("bookingDate").value,
    Time: document.getElementById("bookingTime").value,
    Name: document.getElementById("name").value,
    Contact: document.getElementById("contact").value,
    Pickup: document.getElementById("pickup").value,
    Destination: document.getElementById("destination").value,
    Passengers: document.getElementById("people").value,
    Luggage: document.getElementById("luggage").value,
    "Child Seat Needed": document.getElementById("childSeat").value
  };

  try {
    const response = await fetch("https://formsubmit.co/ajax/robbie6153@icloud.com", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(bookingData)
    });

    if (!response.ok) {
      throw new Error("Email failed");
    }

    bookingForm.classList.add("hidden");
    thankYouMessage.classList.remove("hidden");
    thankYouMessage.scrollIntoView({ behavior: "smooth" });

  } catch (error) {
    alert("Sorry, the booking could not be sent. Please try again.");
  }

  submitBooking.textContent = "Submit Booking";
  submitBooking.disabled = false;
});