import { TextDecoderStream } from "./TextDecoderStream";
const API_URL = "https://minecraft.themagicdoor.org:8000";

async function get_user(username) {
    let reponse = await fetch(API_URL + "/get-user/" + username);
    return reponse.json();
}

async function get_chat(chatid, token) {
    let reponse = await fetch(API_URL + "/get-chat/" + chatid + "/" + token);
    return reponse.json();
}

async function create_chat_link(chatid, token) {
    let reponse = await fetch(API_URL + "/create-chat-link/" + chatid + "/" + token);
    return reponse.json();
}

async function join_chat_link(join_code, token) {
    await fetch(API_URL + "/join-chat-link/" + join_code + "/" + token, {
        method: 'POST',
    });
}

async function login(username, password) {
    let reponse = await fetch(API_URL + "/login/" + username + "/" + password);
    return reponse.json();
}

async function set_user_profile(token, display_name, color) {
    let json = JSON.stringify({ name: display_name, color: color});
    await fetch(API_URL + "/create-user/" + token, {
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

async function create_chat(chatName, members, username) {
    let usernames = [];
    for (var i = 0; i < members.length; i++) {
        usernames.push({ username: members[i].username });
    }
    let json = JSON.stringify({ name: chatName, users: usernames, admin: {username: username}});
    console.log(json);
    return await (await fetch(API_URL + "/create-chat/", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: json,
    })).json();
}

async function edit_chat(name, added_users, admin, chatid, token) {
    let json = JSON.stringify({ new_name: name, added_users: added_users, new_admin: admin});
    await fetch(API_URL + "/edit-chat/" + chatid + "/" + token, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: json,
    });
}

async function subscribeEvents(token, onRecievedMessage) {
    console.log("subscribing to events");
    let lastPingTime = Date.now();
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
                console.log("events done, restarting");
                subscribeEvents(token, onRecievedMessage);
                stop = true;
            }
            let values = value.split("|");
            console.log(values);
            values.pop();
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
    let timestamp = Date.now();
    let json = JSON.stringify({ text: text, from_user: token, chat: chat, timestamp: timestamp });
    fetch(API_URL + "/post-message", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: json,
    });
}

async function received_message(token, message) {
    let json = JSON.stringify(message);
    fetch(API_URL + "/received-message/"+token, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: json,
    });
}

async function read_message(token, message) {
    let json = JSON.stringify(message);
    fetch(API_URL + "/read-message/"+token, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: json,
    });
}

export default { get_user, login, set_user_profile, create_chat, subscribeEvents, send_message, get_chat, token_valid, received_message, edit_chat, read_message, create_chat_link, join_chat_link };