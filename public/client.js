// client.js
const socket = io();
const configuration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
const pc = new RTCPeerConnection(configuration);

const fileInput = document.getElementById('fileInput');
const sendFileButton = document.getElementById('sendFileButton');

let fileChannel;

pc.onicecandidate = (event) => {
    if (event.candidate) {
        socket.emit('signal', { candidate: event.candidate });
    }
};

pc.ondatachannel = (event) => {
    fileChannel = event.channel;
    fileChannel.onmessage = (event) => {
        const blob = new Blob([event.data], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'received_file';
        a.click();
    };
};

socket.on('signal', (data) => {
    if (data.candidate) {
        pc.addIceCandidate(new RTCIceCandidate(data.candidate));
    } else if (data.sdp) {
        pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        if (data.sdp.type === 'offer') {
            pc.createAnswer().then((answer) => {
                pc.setLocalDescription(answer);
                socket.emit('signal', { sdp: answer });
            });
        }
    }
});

sendFileButton.addEventListener('click', () => {
    const file = fileInput.files[0];
    if (file) {
        fileChannel = pc.createDataChannel('fileChannel');
        fileChannel.onopen = () => {
            const chunkSize = 16 * 1024;
            let offset = 0;

            const sendChunk = () => {
                const chunk = file.slice(offset, offset + chunkSize);
                fileChannel.send(chunk);
                offset += chunkSize;
                if (offset < file.size) {
                    requestAnimationFrame(sendChunk);
                }
            };
            sendChunk();
        };

        pc.createOffer().then((offer) => {
            pc.setLocalDescription(offer);
            socket.emit('signal', { sdp: offer });
        });
    }
});
