import { db } from "./firebase.js";

import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

const leaderboardContainer = document.getElementById("leaderboardContainer");

const CURRENT_ROUND = "Premier League Round One";

async function renderLeaderboard() {
  leaderboardContainer.innerHTML = "Loading leaderboard...";

  try {
    const predictionsSnap = await getDocs(
      collection(db, "scorecast24_predictions")
    );

    const rows = [];

    predictionsSnap.forEach((docSnap) => {
      const data = docSnap.data();

      if (data.round !== CURRENT_ROUND) {
        return;
      }

      rows.push({
        id: docSnap.id,
        username: data.username || "Unknown"
      });
    });

    if (rows.length === 0) {
      leaderboardContainer.innerHTML = "<p>No predictions submitted yet.</p>";
      return;
    }

    leaderboardContainer.innerHTML = "";

    rows.forEach((row, index) => {
      const div = document.createElement("div");
      div.className = "leaderboard-row";

      div.innerHTML = `
        <div>#${index + 1}</div>

        <div>
          <div>${row.username}</div>
          <div class="view-predictions-text">View predictions</div>
        </div>

        <div class="leaderboard-points">Entered</div>
      `;

      div.addEventListener("click", () => {
        localStorage.setItem("viewPredictionId", row.id);
        localStorage.setItem("viewPredictionUsername", row.username);
        window.location.href = "view-predictions.html";
      });

      leaderboardContainer.appendChild(div);
    });
  } catch (error) {
    console.error("Leaderboard failed:", error);

    leaderboardContainer.innerHTML = `
      <div class="leaderboard-info">
        <h2>ScoreCast24 Leaderboard</h2>
        <p>The leaderboard could not be loaded.</p>
        <p>Please try again shortly.</p>
      </div>
    `;
  }
}

renderLeaderboard();