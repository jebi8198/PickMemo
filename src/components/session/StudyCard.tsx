'use client';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import styles from './StudyCard.module.css';

interface StudyCardProps {
  topic: string;
  description: string;
  keywords: string[];
  imageUrl?: string;
  isRevealed: boolean;
  onReveal: () => void;
}

export const StudyCard: React.FC<StudyCardProps> = ({ topic, description, keywords, imageUrl, isRevealed, onReveal }) => {
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const imageLoadFailed = Boolean(imageUrl && failedImageUrl === imageUrl);

  return (
    <div className={styles.scene} onClick={!isRevealed ? onReveal : undefined}>
      <motion.div
        className={styles.card}
        initial={false}
        animate={{ rotateY: isRevealed ? 180 : 0 }}
        transition={{ duration: 0.6, type: 'spring', stiffness: 260, damping: 20 }}
      >
        {/* Front */}
        <div className={`${styles.face} ${styles.front}`}>
          <div className={styles.content}>
            <h2 className={styles.topicFront}>{topic}</h2>
            <span className={styles.hint}>탭해서 뒤집기</span>
          </div>
        </div>

        {/* Back */}
        <div className={`${styles.face} ${styles.back}`}>
          <div className={styles.contentBack}>
            <h2 className={styles.topicBack}>{topic}</h2>
            <div className={styles.divider} />
            <div className={styles.description}>
              {description.split('\n').map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
            {imageUrl && !imageLoadFailed && (
              <div className={styles.imageWrapper}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt={topic} className={styles.image} onError={() => setFailedImageUrl(imageUrl)} />
              </div>
            )}
            {imageUrl && imageLoadFailed && (
              <p className={styles.imageError}>이미지를 불러오지 못했습니다.</p>
            )}
            {keywords.length > 0 && (
              <div className={styles.keywords}>
                {keywords.map((kw, i) => (
                  <span key={i} className={styles.keyword}>#{kw}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
