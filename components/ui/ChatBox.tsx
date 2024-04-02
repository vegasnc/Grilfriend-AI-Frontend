import { useRef, useState, useEffect, Dispatch, SetStateAction } from 'react';
import styles from '@/styles/Home.module.css';
import { Message } from '@/types/chat';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import axios, {AxiosRequestConfig} from 'axios';
import 'regenerator-runtime/runtime';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

import 'reactjs-popup/dist/index.css';

interface PropsType {
    chatHistory: Dispatch<SetStateAction<{ history: [string, string][] }>>;
    toggle: () => void;
}

export default function ChatBox(props: PropsType) {
    const [query, setQuery] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [apiError, setError] = useState<string | null>(null);
    const [messageState, setMessageState] = useState<{
        messages: Message[];
        pending?: string;
        history: [string, string][];
    }>({
        messages: [
            {
                message: 'Hello, How are you doing today?',
                type: 'apiMessage',
                audio: ""
            }
        ],
        history: [],
    });
    const [ recording, setRecording ] = useState(false);
    const [ audioSrcURL, setAudioSrcURL ] = useState("");
    const { messages, history } = messageState;

    const {
        transcript,
        listening,
        resetTranscript,
        browserSupportsSpeechRecognition
    } = useSpeechRecognition();

    const messageListRef = useRef<HTMLDivElement>(null);
    const textAreaRef = useRef<HTMLTextAreaElement>(null);

    const backendAPI = axios.create({
        baseURL : "https://chatbot.sdmansiontest.com"
    });
    backendAPI.defaults.headers.common['Content-Type'] = 'application/json';
    backendAPI.defaults.headers.common['User-Agent'] = 'XY';

    useEffect(() => {
        textAreaRef.current?.focus();
    }, []);

    useEffect(() => {
        messageListRef.current?.scrollTo({ top: messageListRef.current.scrollHeight, behavior: 'smooth' });
    }, [messageState.messages]);

    //handle form submission
    async function handleSubmit(e: any) {
        e.preventDefault();

        setError(null);

        if (!query) {
            alert('Please input a question');
            return;
        }

        const question = query.trim();

        setMessageState((state) => ({
            ...state,
            messages: [
                ...state.messages,
                {
                    type: 'userMessage',
                    message: question,
                    audio: ""
                },
            ],
        }));

        setLoading(true);
        setQuery('');

        try {
            const response = await backendAPI.post( "/get_answer", {
                question: question,
            });
            const data = await response.data;

            if (data.error) {
                setError(data.error);
                setLoading(false);
            } else {
                fetchAndUpdateAudioData(data.answer).then((audioURL) => {
                    setMessageState((state) => ({
                        ...state,
                        messages: [
                            ...state.messages,
                            {
                                type: 'apiMessage',
                                message: data.answer,
                                audio: audioURL
                            },
                        ],
                        history: [...state.history, [question, data.answer]],
                    }));

                    props.chatHistory(messageState);
                    setLoading(false);
                }).catch (error => {
                    setLoading(false);
                });
            }
            //scroll to bottom
            messageListRef.current?.scrollTo({ top: messageListRef.current.scrollHeight, behavior: 'smooth' });
        } catch (error) {
            setLoading(false);
            setError('An error occurred while fetching the data. Please try again.');
            console.log('error', error);
        }
    }

    // Function to convert text to audio using ElevenLabs API
    const convertTextToAudio = async (textToConvert: string) => {
        // Set the API key for ElevenLabs API
        // const apiKey = process.env.ELEVEN_LABS_API_KEY;
        const apiKey = "af51400a2e44b449619f86304d951636";

        console.log("API Key >>", apiKey);
    
        // ID of voice to be used for speech
        const voiceId = '21m00Tcm4TlvDq8ikWAM';
    
        // API request options
        const apiRequestOptions : AxiosRequestConfig = {
            method: 'POST',
            url: `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
            headers: {
                accept: 'audio/mpeg',
                'content-type': 'application/json',
                'xi-api-key': apiKey
            },
            data: {
                text: textToConvert,
            },
            responseType: 'arraybuffer', // To receive binary data in response
        };
    
        // Sending the API request and waiting for response
        const apiResponse = await axios.request(apiRequestOptions);
    
        // Return the binary audio data received from API
        return apiResponse.data;
    };

    // Asynchronous function to fetch audio data and update state variable
    const fetchAndUpdateAudioData = async (answer: string) => {
        const audioData = await convertTextToAudio(answer);

        // Create a new Blob object from the fetched audio data with matching MIME type
        const audioBlob = new Blob([audioData], { type: 'audio/mpeg' });

        // Create a URL for the audio blob
        const blobUrl = URL.createObjectURL(audioBlob);

        return blobUrl;
    };

    const startListening = () => {
        setRecording(true);
        setQuery("");
        resetTranscript();
        SpeechRecognition.startListening();
    };

    const stopListening = () => {
        setRecording(false);
        setQuery(transcript);
        resetTranscript();
        SpeechRecognition.stopListening();
    }

    //prevent empty submissions
    const handleEnter = (e: any) => {
        if (e.key === 'Enter' && query) {
            handleSubmit(e);
        } else if (e.key == 'Enter') {
            e.preventDefault();
        }
    };

    return (
        <div
            style={{
                height: '100vh'
            }}
        >
            {/* <Popup
                trigger={triggerPopup}
                position="left bottom"
                closeOnDocumentClick={false}
                closeOnEscape={true}
                repositionOnResize={true}
                arrow={false}
                contentStyle={{ maxWidth: '300px', width: '70vw', padding: '0px' }}
                onOpen={openedPopup}
                onClose={closedPopup}
            > */}
                <div className="flex flex-col gap-4">
                    <div className={styles.chatheader}>
                        <span>AI GF Chatbot</span>
                    </div>
                    <div ref={messageListRef} className={styles.messagelist}>
                        {messages.map((message, index) => {
                            let icon;
                            let className;
                            let audio;
                            if (message.type === 'apiMessage') {
                                icon = (
                                    <Image
                                        key={index}
                                        src="/bot-image.png"
                                        alt="AI"
                                        width="25"
                                        height="25"
                                        className={styles.boticon}
                                        priority
                                    />
                                );
                                className = styles.apimessage;
                                audio = (
                                    <div className={styles.audiobox}>
                                        <audio autoPlay controls>
                                            <source src={message.audio} type='audio/mpeg'/>
                                        </audio>
                                    </div>
                                )
                            } else {
                                icon = (
                                    <Image
                                        key={index}
                                        src="/usericon.png"
                                        alt="Me"
                                        width="28"
                                        height="20"
                                        className={styles.usericon}
                                        priority
                                    />
                                );
                                audio = (<div></div>)
                                // The latest message sent by the user will be animated while waiting for a response
                                className =
                                    loading && index === messages.length - 1
                                        ? styles.usermessagewaiting
                                        : styles.usermessage;
                            }

                            return (
                                <>
                                    <div key={`chatMessage-${index}`} className={className}>
                                        <div className={className == styles.apimessage ? styles.apimessagecontent : styles.usermessagecontent}>
                                            {icon}
                                            <div className={styles.markdownanswer}>
                                                <ReactMarkdown linkTarget="_blank">{message.message}</ReactMarkdown>
                                            </div>
                                        </div>
                                    </div>
                                    {audio}
                                </>
                            );
                        })}
                    </div>

                    {loading ? (
                        <div className={styles.loadingdiv}>
                            <span className={styles.loadingtext}>Generating...</span>
                        </div>
                    ) : (
                        <div>
                            {apiError ? (
                                <div className="border border-red-400 rounded-md p-4 m-1">
                                    <p className="text-red-500">{apiError}</p>
                                </div>
                            ) : (
                                <form className={styles.typingform} onSubmit={handleSubmit}>
                                    <div className={styles.typingdiv}>
                                        <textarea
                                            disabled={loading}
                                            className={styles.typingbox}
                                            rows={1}
                                            onKeyDown={handleEnter}
                                            ref={textAreaRef}
                                            autoFocus={false}
                                            id="userInput"
                                            name="userInput"
                                            placeholder={loading ? 'Waiting for response...' : 'Ask me anything...'}
                                            value={recording ? transcript : query}
                                            // value={query}
                                            onChange={(e) => setQuery(e.target.value)}
                                        />
                                        <div 
                                            className={styles.btnmic}
                                            onTouchStart={startListening}
                                            onMouseDown={startListening}
                                            onTouchEnd={stopListening}
                                            onMouseUp={stopListening} >
                                            <Image
                                                key="mic"
                                                src="/mic.svg"
                                                alt="Me"
                                                width="28"
                                                height="28"
                                                priority
                                            />
                                        </div>
                                    </div>
                                    <button className={styles.btnsend} type="submit" disabled={loading}>
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            width="30"
                                            height="30"
                                            viewBox="0 0 30 30"
                                            fill="none"
                                        >
                                            <path
                                                d="M7.60304 14.4388L13.9405 14.43M11.6869 5.56489L21.6924 10.5677C26.1826 12.8127 26.1737 16.4809 21.6924 18.7348L11.6869 23.7375C4.96053 27.1051 2.20281 24.3474 5.57041 17.6211L7.05533 14.6512L5.57041 11.6814C2.20281 4.95501 4.95169 2.20614 11.6869 5.56489Z"
                                                stroke="white"
                                                strokeWidth="2.10714"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            />
                                        </svg>
                                    </button>
                                </form>
                            )}
                        </div>
                    )}
                </div>
            {/* </Popup> */}
        </div>
    );
}
