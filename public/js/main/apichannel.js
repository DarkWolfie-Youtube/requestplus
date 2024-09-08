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

    // Submit the form
    document.body.appendChild(form);
    form.submit();
}