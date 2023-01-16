import { TextDecoderStream } from "./TextDecoderStream";
const API_URL = "http://71.197.148.230:8000";

async function get_user(username) {
    let reponse = await fetch(API_URL + "/get-user/" + username);
    return reponse.json();
}

async function get_chat(chatid, token) {
    let reponse = await fetch(API_URL + "/get-chat/" + chatid + "/" + token);
    return reponse.json();
}

async function login(username, password) {
    let reponse = await fetch(API_URL + "/login/" + username + "/" + password);
    return reponse.json();
}

async function set_user_profile(token, display_name) {
    let json = JSON.stringify({ name: display_name });
    fetch(API_URL + "/create-user/" + token, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: json,
    });
}

async function token_valid(token) {
    let reponse = await fetch(API_URL + "/token-valid/" + token);
    let text = await reponse.text();
    return (text === "true");
}

async function create_chat(chatName, members) {
    let usernames = [];
    for (var i = 0; i < members.length; i++) {
        usernames.push({ username: members[i].username });
    }
    let json = JSON.stringify({ name: chatName, users: usernames });
    return await (await fetch(API_URL + "/create-chat/", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: json,
    })).json();
}

async function subscribeEvents(token, onRecievedMessage) {
    let lastPingTime = 0;
    let stop = false;
    let pingInterval = setInterval(() => {
        if (Date.now() - lastPingTime > 60000) {
            console.log("no ping in ", Date.now() - lastPingTime, "millis");
            stop = true;
        }
        if (stop) {
            console.log("restarting event stream!");
            clearInterval(pingInterval);
            subscribeEvents(token, onRecievedMessage);
        }
    }, 3000);
    fetch(API_URL + "/events/" + token).then(async res => {
        const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
        while (!stop) {
            const { done, value } = await reader.read();
            if (done) {
                subscribeEvents(token, onRecievedMessage);
                stop = true;
            }
            let values = value.split("|");
            values.pop();
            console.log(values);
            for (var i = 0; i < values.length; i++) {
                let message = values[i];
                if (JSON.parse(message).server !== undefined) {
                    if (JSON.parse(message).server === "ping") {
                        lastPingTime = Date.now();
                    }
                } else {
                    onRecievedMessage(message);
                }
            }
        }
    });
}

async function send_message(text, token, chat) {
    let json = JSON.stringify({ text: text, from_user: token, chat: chat });
    fetch(API_URL + "/post-message", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: json,
    });
}

async function received_message(token, message) {
    fetch(API_URL + "/received-message/"+token+"/"+message, {
        method: 'POST',
    });
}

export default { get_user, login, set_user_profile, create_chat, subscribeEvents, send_message, get_chat, token_valid, received_message };