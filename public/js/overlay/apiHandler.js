let stop = false;

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

function userAccepted(user, data){
    var string = `${data.message}`
    if (string.includes(user)) {
        getInfo(user)
        setInterval(() => {
            if (stop == true) return
            getInfo(user)
    }, 5000);
    }
}   

async function getInfo(user){
    const overlayContainer = document.getElementById('overlay-container');


    
    const songText = document.querySelector('.song-name-text');
    const artistText = document.querySelector('.artist-name-text');
    const songImg = document.querySelector('.cover');
    const timeText = document.querySelector('.overlay-timer-text');
    const durationText = document.querySelector('.overlay-timer-text2');
    const timeBar = document.querySelector('.overlay-timer-bar');
    $.ajax({
        url: "nowplaying/?user=" + user,
        type: "GET",

        success: async function(data){
        var info = data.data;
        console.log(data)

        if (data.message == "No song playing") {
            songText.textContent = "No Song Playing";
            artistText.textContent = "";
            songImg.src = "img/overlay/placeholder.png";
            return
        }

        if (overlayContainer.classList.contains('overlay-container-error')) {
            overlayContainer.classList.remove('overlay-container-error');
            overlayContainer.classList.add('overlay-container');
        }
        songText.textContent = info.song_name;
        if (info.artists == null){
            artistText.textContent = "";
        }
        else {
            
            artistText.textContent = info.artists[0].name;
        }
        if (info.song_cover == null) {
            songImg.src = "img/overlay/placeholder.png";
        } else{
            if (info.song_cover != songImg.src){
                songImg.src = info.song_cover;
            }
        }
        // convert time to mm:ss
        timeText.textContent = convertTime(info.progress);
        durationText.textContent = convertTime(info.totalMS);
        var timeBarWidth = (info.progress / info.totalMS) * 385; // Max width is 385px
        timeBar.style.width = Math.min(timeBarWidth, 385) + "px";
        await wait(1000)
        if ((info.progress + 1000) >= info.totalMS) { 
            getInfo(user) 
            return;
        }
        timeText.textContent = convertTime(info.progress + 1000);
        durationText.textContent = convertTime(info.totalMS);
        var timeBarWidth = ((info.progress + 1000) / info.totalMS) * 385; // Max width is 385px
        timeBar.style.width = Math.min(timeBarWidth, 385) + "px";
        await wait(1000)
        if ((info.progress + 2000) >= info.totalMS) { 
            getInfo(user) 
            return;
        }
        timeText.textContent = convertTime(info.progress + 2000);
        durationText.textContent = convertTime(info.totalMS);
        var timeBarWidth = ((info.progress + 2000) / info.totalMS) * 385; // Max width is 385px
        timeBar.style.width = Math.min(timeBarWidth, 385) + "px";
        await wait(1000)
        if ((info.progress + 3000) >= info.totalMS) { 
            getInfo(user) 
            return;
        }
        timeText.textContent = convertTime(info.progress + 3000);
        durationText.textContent = convertTime(info.totalMS);
        var timeBarWidth = ((info.progress + 3000) / info.totalMS) * 385; // Max width is 385px
        timeBar.style.width = Math.min(timeBarWidth, 385) + "px";
        await wait(1000)
        if ((info.progress + 4000) >= info.totalMS) { 
            getInfo(user)
            return;
        }
        timeText.textContent = convertTime(info.progress + 4000);
        durationText.textContent = convertTime(info.totalMS);
        var timeBarWidth = ((info.progress + 4000) / info.totalMS) * 385; // Max width is 385px
        timeBar.style.width = Math.min(timeBarWidth, 385) + "px";
        
    },

    error: function(xhr, status, error){
        if (xhr.status == 500) {
            var sick = JSON.parse(xhr.responseText);
            if (sick.message == "No user provided" | sick.message == "No user exists") noUserExists()
            if (sick.message == "Token is invalid or expired") {
                var overlayContainer = document.querySelector('.overlay-container');
                songText.textContent = "ERR: Token is invalid or expired";
                artistText.textContent = "";
                overlayContainer.classList.add('overlay-container-error');
                overlayContainer.classList.remove('overlay-container');
            }
        }
        if (xhr.status == 403) tooManyRequests()
    }

})
        
}

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

function tooManyRequests(){

    const overlayContainer = document.querySelector('.overlay-container');
    const songText = document.querySelector('.song-name-text');
    const artistText = document.querySelector('.artist-name-text');
    overlayContainer.classList.add('overlay-container-error');
    overlayContainer.classList.remove('overlay-container');
    songText.textContent = "ERR: Request+ has issued too many requests.";
    artistText.textContent = "Join the discord for more info.";
    stop = true

}

async function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }