let settings = {
    user: "",
    style: ""

}
const Overlaybutton = document.getElementById('Overlaybutton');


function getSettings() {
    const styleSelect = document.getElementById('style');
    const selectedOption = styleSelect.options[styleSelect.selectedIndex].value;
    console.log(selectedOption);

    settings.user = document.getElementById('user').innerHTML;
    settings.style = selectedOption;
    saveSettings()
}

function saveSettings() {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '/api/settings';

    // Create form fields
    const input1 = document.createElement('input');
    input1.type = 'hidden';
    input1.name = 'user';
    input1.value = settings.user;
    form.appendChild(input1);

    const input2 = document.createElement('input');
    input2.type = 'hidden';
    input2.name = 'style';
    input2.value = settings.style;
    form.appendChild(input2);

    // Submit the form
    document.body.appendChild(form);
    form.submit();
}

function cpyOverlayURI(user){
    navigator.clipboard.writeText("https://requestplus.xyz/overlay?user=" + user);
    Overlaybutton.innerHTML = "Copied!";
    setTimeout(function(){ Overlaybutton.innerHTML = "Copy Overlay URL"; }, 2000);

}


function enableBotCommand(){
    const styleSelect = document.getElementById('style');
    const selectedOption = styleSelect.options[styleSelect.selectedIndex].value;
    console.log(selectedOption);

    settings.user = document.getElementById('user').innerHTML;
    settings.style = selectedOption;

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '/api/settings';

    // Create form fields
    const input1 = document.createElement('input');
    input1.type = 'hidden';
    input1.name = 'user';
    input1.value = settings.user;
    form.appendChild(input1);

    const input2 = document.createElement('input');
    input2.type = 'hidden';
    input2.name = 'enabledRequests';
    input2.value = 1;
    form.appendChild(input2);

    // Submit the form
    document.body.appendChild(form);
    form.submit();

}


function disableBotCommand(){
    const styleSelect = document.getElementById('style');
    const selectedOption = styleSelect.options[styleSelect.selectedIndex].value;
    console.log(selectedOption);

    settings.user = document.getElementById('user').innerHTML;
    settings.style = selectedOption;

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '/api/settings';

    // Create form fields
    const input1 = document.createElement('input');
    input1.type = 'hidden';
    input1.name = 'user';
    input1.value = settings.user;
    form.appendChild(input1);

    const input2 = document.createElement('input');
    input2.type = 'hidden';
    input2.name = 'enabledRequests';
    input2.value = 0;
    form.appendChild(input2);

    // Submit the form
    document.body.appendChild(form);
    form.submit();

}


function whitelist(bool){
    const styleSelect = document.getElementById('style');
    const selectedOption = styleSelect.options[styleSelect.selectedIndex].value;
    console.log(selectedOption);

    settings.admin = document.getElementById('user').innerHTML;
    settings.user = document.getElementById('user-id').innerHTML;
    settings.style = selectedOption;

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '/api/admin';

    // Create form fields
    const input1 = document.createElement('input');
    input1.type = 'hidden';
    input1.name = 'admin';
    input1.value = settings.admin;
    form.appendChild(input1);

    const input2 = document.createElement('input');
    input2.type = 'hidden';
    input2.name = 'user';
    input2.value = settings.user;
    form.appendChild(input2);

    const input3 = document.createElement('input');
    input3.type = 'hidden';
    input3.name = 'whitelist';
    input3.value = bool;
    form.appendChild(input3);



    // Submit the form
    document.body.appendChild(form);
    form.submit();
    
}