let settings = {
    user: "",
    style: ""

}

function createChannelPoints() {
    settings.user = document.getElementById('user').innerHTML;
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '/api/channelpoints';

    // Create form fields
    const input1 = document.createElement('input');
    input1.type = 'hidden';
    input1.name = 'user';
    input1.value = settings.user;
    form.appendChild(input1);

    const input2 = document.createElement('input');
    input2.type = 'hidden';
    input2.name = 'channelEnable';
    input2.value = 1;
    form.appendChild(input2);

    // Submit the form
    document.body.appendChild(form);
    form.submit();
}

function deleteChannelPoints() {
    settings.user = document.getElementById('user').innerHTML;
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '/api/channelpoints';

    // Create form fields
    const input1 = document.createElement('input');
    input1.type = 'hidden';
    input1.name = 'user';
    input1.value = settings.user;
    form.appendChild(input1);

    const input2 = document.createElement('input');
    input2.type = 'hidden';
    input2.name = 'channelEnable';
    input2.value = 0;
    form.appendChild(input2);

    // Submit the form
    document.body.appendChild(form);
    form.submit();
}