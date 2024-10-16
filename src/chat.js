import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import './Chat.css'; // Import CSS for styling
import EmojiPicker from 'emoji-picker-react';

const socket = io('http://localhost:4000');

const Chat = () => {
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [username, setUsername] = useState('');
    const [isUsernameSet, setIsUsernameSet] = useState(false);
    const [attachment, setAttachment] = useState(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [isVideoCall, setIsVideoCall] = useState(false);

    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const peerRef = useRef(null);

    useEffect(() => {
        socket.on('receiveMessage', (msg) => {
            setMessages((prevMessages) => [...prevMessages, msg]);
        });

        return () => {
            socket.off('receiveMessage');
        };
    }, []);

    const sendMessage = () => {
        if ((message || attachment) && username) {
            const msgObject = {
                text: message,
                user: username,
                time: new Date().toLocaleTimeString(),
                attachment: attachment ? URL.createObjectURL(attachment) : null,
            };
            socket.emit('sendMessage', msgObject);
            setMessage('');
            setAttachment(null);
        } else {
            alert("Please enter a username and a message or an attachment");
        }
    };

    const toggleChat = () => {
        setIsOpen(!isOpen);
    };

    const handleUsernameSubmit = () => {
        if (username) {
            setIsUsernameSet(true);
        }
    };

    const handleAttachmentChange = (e) => {
        setAttachment(e.target.files[0]);
    };

    const addEmoji = (emojiData) => {
        if (emojiData && emojiData.emoji) {
            setMessage((prevMessage) => prevMessage + emojiData.emoji);
        }
        setShowEmojiPicker(false);
    };

    const startCall = async (video = false) => {
        setIsVideoCall(video);

        // Create a dummy media stream
        const dummyStream = new MediaStream();

        // Create a dummy audio track
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4 note
        oscillator.start();

        const mediaStreamDestination = audioContext.createMediaStreamDestination();
        oscillator.connect(mediaStreamDestination);
        oscillator.connect(audioContext.destination); // For sound output
        const audioTrack = mediaStreamDestination.stream.getAudioTracks()[0];

        // Add the audio track to the dummy stream
        dummyStream.addTrack(audioTrack);

        if (video) {
            // Create a dummy video track using a canvas
            const canvas = document.createElement('canvas');
            canvas.width = 640;
            canvas.height = 480;
            const ctx = canvas.getContext('2d');
            let frameCount = 0;

            // Draw a simple animation
            const draw = () => {
                ctx.fillStyle = `hsl(${frameCount * 3}, 100%, 50%)`; // Change color over time
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                frameCount++;
                requestAnimationFrame(draw);
            };

            draw();
            const videoTrack = canvas.captureStream(30).getVideoTracks()[0]; // 30 FPS
            dummyStream.addTrack(videoTrack);
        }

        setLocalStream(dummyStream);
        
        // Ensure the localVideoRef is available before setting srcObject
        if (localVideoRef.current) {
            localVideoRef.current.srcObject = dummyStream;
        }
    };

    return (
        <div>
            <button onClick={toggleChat} className="chat-toggle">
                {isOpen ? 'Close Chat' : 'Open Chat'}
            </button>
            {isOpen && (
                <div className="chat-popup">
                    <div className="chat-header">
                        <span>Chat</span>
                        <button className="close-btn" onClick={toggleChat}>✖</button>
                    </div>
                    <div className="username-input">
                        {isUsernameSet ? (
                            <span className="username-display">{username}</span>
                        ) : (
                            <input
                                type="text"
                                placeholder="Enter your username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleUsernameSubmit()}
                            />
                        )}
                    </div>
                    {isUsernameSet && (
                        <>
                            <div className="chat-messages">
                                {messages.map((msg, index) => (
                                    <div key={index} className={msg.user === username ? 'my-message' : 'other-message'}>
                                        {index > 0 && messages[index - 1] && msg.user !== messages[index - 1].user ? (
                                            <strong>{msg.user}: </strong>
                                        ) : null}
                                        {msg.text}
                                        {msg.attachment && <img src={msg.attachment} alt="attachment" className="attachment" />}
                                        <span className="message-time">{msg.time}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="input-container">
                                <input
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                                    placeholder="Type a message..."
                                />
                                <span className="emoji-icon" onClick={() => setShowEmojiPicker(!showEmojiPicker)}>😊</span>
                                <span className="pin-icon" onClick={() => document.getElementById('attachment-input').click()}>📎</span>
                                <input
                                    id="attachment-input"
                                    type="file"
                                    style={{ display: 'none' }}
                                    onChange={handleAttachmentChange}
                                />
                                <button onClick={sendMessage}>Send</button>
                                <button onClick={() => startCall()}>🎤</button>
                                <button onClick={() => startCall(true)}>🎥</button>
                                {showEmojiPicker && (
                                    <div className="emoji-picker-container">
                                        <EmojiPicker 
                                            onEmojiClick={addEmoji}
                                            pickerStyle={{ width: '250px', height: '200px' }} // Adjust size
                                        />
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}
            {/* Video call components */}
            {localStream && (
                <div className="video-call">
                    <video ref={localVideoRef} autoPlay muted />
                    {remoteStream && <video ref={remoteVideoRef} autoPlay />}
                </div>
            )}
        </div>
    );
};

export default Chat;
