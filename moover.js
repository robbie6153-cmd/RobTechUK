const bookNowBtn = document.getElementById("bookNowBtn");
const bookingForm = document.getElementById("bookingForm");
const submitBooking = document.getElementById("submitBooking");
const thankYouMessage = document.getElementById("thankYouMessage");

bookNowBtn.addEventListener("click", () => {
  bookingForm.classList.remove("hidden");
  bookingForm.scrollIntoView({ behavior: "smooth" });
});

submitBooking.addEventListener("click", () => {
  bookingForm.classList.add("hidden");
  thankYouMessage.classList.remove("hidden");
  thankYouMessage.scrollIntoView({ behavior: "smooth" });
});