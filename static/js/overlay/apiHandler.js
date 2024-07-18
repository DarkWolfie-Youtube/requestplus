function apiInit(user){
    //make a fetch call with request mode no-cors using jQuery

    $.ajax({
        url: "overlayinfo/?user=" + user,
        type: "GET",
        
        success: function(data){
            userAccepted(user, data)
        },
        error: function(xhr, status, error){
             var sick = JSON.parse(xhr.responseText);
             if (sick.message == "No user provided" | sick.message == "No user exists") noUserExists()// Log the error response
        }
        // make it when the api returns code 404, show an error


    })
}


function noUserExists(){
    const overlayContainer = document.querySelector('.overlay-container');
    const songText = document.querySelector('.song-name-text');
    overlayContainer.classList.add('overlay-container-error');
    overlayContainer.classList.remove('overlay-container');

    songText.textContent = "ERR: No user exists!";

}

let timeelapsed = null;
let timeduration = null;

function setInfo(json){
    
    const songText = document.querySelector('.song-name-text');
    const artistText = document.querySelector('.artist-name-text');
    const songImg = document.querySelector('.cover');
    const timeText = document.querySelector('.overlay-timer-text');
    const durationText = document.querySelector('.overlay-timer-text2');
    const timeBar = document.querySelector('.overlay-timer-bar');
    var info = json.now_playing;
    songText.textContent = info.song.title;
    artistText.textContent = info.song.artist;
    if (info.song.art == null) {
        songImg.src = "https://i.ibb.co/0jyJpX8/placeholder.png";
    } else if (info.song.art != songImg.src){
        songImg.src = info.song.art;
    }
    // convert time to mm:ss
    timeelapsed = info.elapsed
    timeduration = info.duration
    timeText.textContent = convertTime(info.elapsed * 1000);
    durationText.textContent = convertTime(info.duration * 1000);
    var timeBarWidth = (info.elapsed / info.duration) * 385; // Max width is 385px
    timeBar.style.width = Math.min(timeBarWidth, 385) + "px";

        
}




setInterval(() => {
    if (timeelapsed != null) {
        timeelapsed = timeelapsed + 1
        const timeText = document.querySelector('.overlay-timer-text');
        timeText.textContent = convertTime(timeelapsed * 1000);
        const timeBar = document.querySelector('.overlay-timer-bar');
        var timeBarWidth = (timeelapsed / timeduration) * 385; // Max width is 385px
        timeBar.style.width = Math.min(timeBarWidth, 385) + "px";
    }
}, 1000);

function convertTime(ms) {
    var ms = ms / 1000;
    var mins = Math.floor(ms / 60);
    var secs = Math.floor(ms % 60);
    if (secs < 10) {
        secs = "0" + secs;
    }
    if (mins < 10) {
        mins = "0" + mins;
    }

    return mins + ":" + secs;
}



setInterval(() => {
    


  const maxWidth = 375;
  const songText = document.querySelector(".song-name-text");
  
  if (  songText.getBoundingClientRect().width > maxWidth
    
  ) {
    songText.style.animation = "scrollText 6.78s linear infinite alternate";
  } else {
    songText.style.animation = "none";
  }

}, 10)



let socket = new WebSocket("ws://45.126.209.211:8080/api/live/nowplaying/websocket");

socket.onopen = function(e) {
  socket.send(JSON.stringify({
    "subs": {
      "station:darkwolfie": {"recover": true}
    }
  }));
};

let nowplaying = {};
let currentTime = 0;

// Handle a now-playing event from a station. Update your now-playing data accordingly.
function handleSseData(ssePayload, useTime = true) {
  const jsonData = ssePayload.data;

  if (useTime && 'current_time' in jsonData) {
    currentTime = jsonData.current_time;
  }

  nowplaying = jsonData.np;
  setInfo(jsonData.np);
}

socket.onmessage = function(e) {
  const jsonData = JSON.parse(e.data);

  if ('connect' in jsonData) {
    const connectData = jsonData.connect;

    if ('data' in connectData) {
      // Legacy SSE data
      connectData.data.forEach(
        (initialRow) => handleSseData(initialRow)
      );
    } else {
      // New Centrifugo time format
      if ('time' in connectData) {
        currentTime = Math.floor(connectData.time / 1000);
      }

      // New Centrifugo cached NowPlaying initial push.
      for (const subName in connectData.subs) {
        const sub = connectData.subs[subName];
        if ('publications' in sub && sub.publications.length > 0) {
          sub.publications.forEach((initialRow) => handleSseData(initialRow, false));
        }
      }
    }
  } else if ('pub' in jsonData) {
    handleSseData(jsonData.pub);
  }
}
