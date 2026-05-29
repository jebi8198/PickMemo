'use client';
import React, { useState } from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import styles from './PageForm.module.css';

export interface PageFormData {
  topic: string;
  description: string;
  keywords: string[];
  imageUrl?: string;
}

interface PageFormProps {
  initialData?: { topic: string; description: string; keywords: string; imageUrl?: string };
  onSubmit: (data: PageFormData) => void | Promise<void>;
  onSubmitMany?: (data: PageFormData[]) => void | Promise<void>;
  isLoading?: boolean;
}

type FormMode = 'manual' | 'json';

const exampleJson = `[
  {
    "topic": "에빙하우스 망각 곡선",
    "description": "시간이 지날수록 기억 보존율이 감소한다는 이론입니다.",
    "keywords": ["망각", "반복", "장기기억"],
    "imageUrl": ""
  }
]`;

const llmJsonPrompt = `아래 학습 자료를 PickMemo에 일괄 등록할 수 있는 JSON 배열로 정리해줘.

규칙:
- 반드시 JSON만 출력해. 설명, 마크다운 코드블록, 주석은 쓰지 마.
- 최상위 구조는 배열이어야 해.
- 각 항목은 topic, description, keywords, imageUrl 필드만 사용해.
- topic은 카드 앞면에 들어갈 짧은 질문 또는 핵심 키워드로 작성해.
- description은 카드 뒷면에 들어갈 정확하고 충분한 답변으로 작성해.
- keywords는 힌트용 핵심어 문자열 배열로 작성해.
- imageUrl은 이미지가 없으면 빈 문자열로 둬.
- 중복된 topic은 만들지 마.

출력 예시:
[
  {
    "topic": "핵심 개념",
    "description": "카드 뒷면에 표시할 설명입니다.",
    "keywords": ["키워드1", "키워드2"],
    "imageUrl": ""
  }
]

학습 자료:
`;

function normalizeImageUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';

  try {
    const url = new URL(trimmed);
    const redirectedImage = url.searchParams.get('imgurl') || url.searchParams.get('url');
    return redirectedImage ? decodeURIComponent(redirectedImage) : trimmed;
  } catch {
    return trimmed;
  }
}

function findDuplicateKey(json: string) {
  const objectMatches = json.match(/\{[^{}]*\}/g) || [json];

  for (const objectText of objectMatches) {
    const keys = new Set<string>();
    const keyRegex = /"([^"\\]*(?:\\.[^"\\]*)*)"\s*:/g;
    let match = keyRegex.exec(objectText);

    while (match) {
      const key = match[1];
      if (keys.has(key)) return key;
      keys.add(key);
      match = keyRegex.exec(objectText);
    }
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toPageFormData(value: unknown): PageFormData {
  if (!isRecord(value)) {
    throw new Error('각 항목은 객체여야 합니다.');
  }

  const topic = typeof value.topic === 'string' ? value.topic.trim() : '';
  const description = typeof value.description === 'string' ? value.description.trim() : '';
  const keywords = Array.isArray(value.keywords)
    ? value.keywords
        .filter((keyword): keyword is string => typeof keyword === 'string')
        .map((keyword) => keyword.trim())
        .filter(Boolean)
    : typeof value.keywords === 'string'
      ? value.keywords.split(',').map((keyword) => keyword.trim()).filter(Boolean)
      : [];
  const imageUrl = typeof value.imageUrl === 'string' ? normalizeImageUrl(value.imageUrl) : '';

  if (!topic || !description) {
    throw new Error('모든 카드에는 topic과 description이 필요합니다.');
  }

  return {
    topic,
    description,
    keywords,
    imageUrl: imageUrl || undefined,
  };
}

function parseBulkJson(json: string) {
  const duplicateKey = findDuplicateKey(json);
  if (duplicateKey) {
    throw new Error(`중복된 키 '${duplicateKey}'이(가) 검출되었습니다. 같은 객체 안에서는 키를 한 번만 사용해주세요.`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('올바른 JSON 형식이 아닙니다. 예제 형식에 맞춰 다시 확인해주세요.');
  }

  const items = Array.isArray(parsed)
    ? parsed
    : isRecord(parsed) && Array.isArray(parsed.pages)
      ? parsed.pages
      : isRecord(parsed) && Array.isArray(parsed.cards)
        ? parsed.cards
        : isRecord(parsed) && Array.isArray(parsed.items)
          ? parsed.items
          : [parsed];

  return items.map(toPageFormData);
}

export const PageForm: React.FC<PageFormProps> = ({ initialData, onSubmit, onSubmitMany, isLoading }) => {
  const [topic, setTopic] = useState(initialData?.topic || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [keywords, setKeywords] = useState(initialData?.keywords || '');
  const [imageUrl, setImageUrl] = useState(initialData?.imageUrl || '');
  const [mode, setMode] = useState<FormMode>('manual');
  const [jsonInput, setJsonInput] = useState(exampleJson);
  const [error, setError] = useState('');
  const [imageError, setImageError] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);

  const normalizedImageUrl = normalizeImageUrl(imageUrl);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const keywordsList = keywords.split(',').map((keyword) => keyword.trim()).filter(Boolean);
    await onSubmit({
      topic: topic.trim(),
      description: description.trim(),
      keywords: keywordsList,
      imageUrl: normalizedImageUrl || undefined,
    });
  };

  const handleJsonSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const pages = parseBulkJson(jsonInput);
      if (pages.length === 0) {
        setError('추가할 카드가 없습니다.');
        return;
      }

      if (onSubmitMany) {
        await onSubmitMany(pages);
      } else {
        await Promise.all(pages.map((page) => onSubmit(page)));
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'JSON 입력을 처리하지 못했습니다.');
    }
  };

  const handleImageUrlChange = (value: string) => {
    setImageUrl(value);
    setImageError(false);
  };

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(llmJsonPrompt);
      setPromptCopied(true);
      window.setTimeout(() => setPromptCopied(false), 1600);
    } catch {
      setError('프롬프트를 복사하지 못했습니다. 아래 내용을 직접 선택해 복사해주세요.');
    }
  };

  return (
    <form className={styles.form} onSubmit={mode === 'manual' ? handleManualSubmit : handleJsonSubmit}>
      {!initialData && (
        <div className={styles.tabs}>
          <button type="button" className={`${styles.tab} ${mode === 'manual' ? styles.activeTab : ''}`} onClick={() => setMode('manual')}>
            직접 입력
          </button>
          <button type="button" className={`${styles.tab} ${mode === 'json' ? styles.activeTab : ''}`} onClick={() => setMode('json')}>
            {'{ } JSON 일괄 입력'}
          </button>
        </div>
      )}

      {mode === 'manual' || initialData ? (
        <>
          <Input
            label="주제 (질문 또는 키워드)"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            required
          />
          <div className={styles.field}>
            <label className={styles.label}>상세 내용 (답변)</label>
            <textarea
              className={styles.textarea}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={6}
            />
          </div>
          <Input
            label="키워드 힌트 (쉼표로 구분)"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="예: 리액트, 훅, 상태관리"
          />
          <Input
            label="이미지 URL (선택사항)"
            value={imageUrl}
            onChange={(e) => handleImageUrlChange(e.target.value)}
            onBlur={() => setImageUrl(normalizedImageUrl)}
          />
          {normalizedImageUrl && (
            <div className={styles.preview}>
              {imageError ? (
                <p className={styles.previewError}>이미지를 불러오지 못했습니다. 직접 접근 가능한 이미지 URL인지 확인해주세요.</p>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={normalizedImageUrl} alt="이미지 미리보기" className={styles.previewImage} onError={() => setImageError(true)} />
              )}
            </div>
          )}
        </>
      ) : (
        <>
          <div className={styles.field}>
            <label className={styles.label}>JSON 카드 목록</label>
            <textarea
              className={`${styles.textarea} ${styles.jsonTextarea}`}
              value={jsonInput}
              onChange={(e) => {
                setJsonInput(e.target.value);
                setError('');
              }}
              rows={14}
              spellCheck={false}
            />
          </div>

          <div className={styles.promptBox}>
            <div className={styles.promptHeader}>
              <div>
                <p className={styles.promptTitle}>외부 LLM 변환 프롬프트</p>
                <p className={styles.promptHelp}>자료를 JSON 카드 목록으로 바꿀 때 이 프롬프트를 먼저 복사해 사용하세요.</p>
              </div>
              <button type="button" className={styles.copyPromptButton} onClick={handleCopyPrompt}>
                {promptCopied ? '복사됨' : '복사'}
              </button>
            </div>
            <textarea
              className={`${styles.textarea} ${styles.promptTextarea}`}
              value={llmJsonPrompt}
              readOnly
              rows={12}
              spellCheck={false}
            />
          </div>
        </>
      )}

      {error && <p className={styles.error}>{error}</p>}

      <Button type="submit" loading={isLoading} className={styles.submitBtn}>
        {initialData ? '수정 완료' : mode === 'json' ? '일괄 추가하기' : '페이지 추가'}
      </Button>
    </form>
  );
};
