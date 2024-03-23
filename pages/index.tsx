import { useState, useRef } from 'react';
import Layout from '@/components/layout';
import styles from '@/styles/Home.module.css';

import ChatBox from '@/components/ui/ChatBox';
import useModal from "@/hooks/useModal";

export default function Home() {

  const { isOpen, toggle } = useModal();

  const [chatHistory, setChatHistory] = useState<{
    history: [string, string][];
  }>({
    history: []
  });



  return (
    <>
      <Layout>
        
        <ChatBox chatHistory={setChatHistory} toggle={toggle}></ChatBox>

      </Layout>
    </>
  );
}
