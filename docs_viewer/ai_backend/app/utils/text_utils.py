import re
import logging
from typing import List, Dict, Any, Optional, Tuple
import unicodedata
from pathlib import Path
import json

logger = logging.getLogger(__name__)

class TextUtils:
    """Utility class for text processing operations"""
    
    @staticmethod
    def normalize_text(text: str) -> str:
        """
        Normalize text by removing extra whitespace, normalizing unicode, etc.
        
        Args:
            text: Input text to normalize
            
        Returns:
            Normalized text
        """
        if not text:
            return ""
            
        # Convert to unicode if not already
        if not isinstance(text, str):
            text = str(text)
        
        # Normalize unicode (e.g., convert é to e + ')
        text = unicodedata.normalize('NFKD', text)
        
        # Replace various whitespace with a single space
        text = re.sub(r'\s+', ' ', text)
        
        # Remove control characters
        text = ''.join(ch for ch in text if unicodedata.category(ch)[0] != 'C' or ch in '\n\r\t')
        
        return text.strip()
    
    @staticmethod
    def truncate_text(text: str, max_length: int = 1000, ellipsis: str = '...') -> str:
        """
        Truncate text to a maximum length, preserving word boundaries
        
        Args:
            text: Text to truncate
            max_length: Maximum length of the result (including ellipsis if added)
            ellipsis: String to append if text is truncated
            
        Returns:
            Truncated text with ellipsis if needed
        """
        if not text or len(text) <= max_length:
            return text
            
        if len(ellipsis) >= max_length:
            return ellipsis[:max_length]
            
        # Find the last space before the max length
        truncated = text[:max_length - len(ellipsis)]
        last_space = truncated.rfind(' ')
        
        if last_space > 0:
            truncated = truncated[:last_space]
            
        return f"{truncated}{ellipsis}"
    
    @staticmethod
    def extract_metadata(text: str) -> Tuple[str, Dict[str, Any]]:
        """
        Extract metadata from text (e.g., frontmatter in markdown)
        
        Args:
            text: Text potentially containing metadata
            
        Returns:
            Tuple of (cleaned_text, metadata_dict)
        """
        metadata = {}
        cleaned_text = text
        
        # Check for YAML frontmatter (common in markdown)
        yaml_pattern = r'^---\s*\n(.*?)\n---\s*\n(.*)$'
        yaml_match = re.match(yaml_pattern, text, re.DOTALL)
        
        if yaml_match:
            import yaml
            try:
                metadata = yaml.safe_load(yaml_match.group(1)) or {}
                cleaned_text = yaml_match.group(2)
            except Exception as e:
                logger.warning(f"Error parsing YAML frontmatter: {e}")
        
        # Check for JSON frontmatter
        json_pattern = r'^\s*\{\s*\n(.*?)\n\s*\}\s*\n(.*)$'
        json_match = re.match(json_pattern, text, re.DOTALL)
        
        if json_match and not metadata:  # Only if YAML parsing didn't work
            try:
                metadata = json.loads(f"{{{json_match.group(1)}}}")
                cleaned_text = json_match.group(2)
            except Exception as e:
                logger.warning(f"Error parsing JSON frontmatter: {e}")
        
        return cleaned_text, metadata
    
    @staticmethod
    def count_tokens(text: str, model: str = "gpt-3.5-turbo") -> int:
        """
        Count the number of tokens in a text string
        
        Args:
            text: Text to count tokens for
            model: Model name to use for tokenization
            
        Returns:
            Number of tokens
        """
        try:
            import tiktoken
            encoding = tiktoken.encoding_for_model(model)
            return len(encoding.encode(text))
        except ImportError:
            # Fallback: approximate token count (4 chars ~= 1 token)
            return max(1, len(text) // 4)
    
    @staticmethod
    def split_into_sentences(text: str) -> List[str]:
        """
        Split text into sentences
        
        Args:
            text: Text to split
            
        Returns:
            List of sentences
        """
        # This is a simple implementation that works for many cases
        # For more accurate sentence splitting, consider using NLTK or spaCy
        
        if not text:
            return []
            
        # Handle common abbreviations that shouldn't end sentences
        abbreviations = {'mr', 'mrs', 'ms', 'dr', 'prof', 'vs', 'e.g', 'i.e', 'etc', 'jr', 'sr', 'no'}
        
        # Replace newlines with spaces
        text = text.replace('\n', ' ').replace('\r', '')
        
        # Add spaces after punctuation that might not have them
        text = re.sub(r'([.!?])([^\s])', r'\1 \2', text)
        
        # Split on sentence boundaries
        sentences = []
        current = []
        
        for word in text.split():
            current.append(word)
            
            # Check if this word ends a sentence
            if word[-1] in '.!?':
                # Check if it's an abbreviation
                if word.lower() in abbreviations or \
                   (len(word) > 1 and word[0].islower() and word[-1] == '.'):
                    continue
                    
                # Add the current sentence
                sentence = ' '.join(current).strip()
                if sentence:
                    sentences.append(sentence)
                current = []
        
        # Add any remaining text
        if current:
            sentence = ' '.join(current).strip()
            if sentence:
                sentences.append(sentence)
        
        return sentences
    
    @staticmethod
    def extract_keywords(text: str, top_n: int = 10) -> List[Tuple[str, float]]:
        """
        Extract keywords from text using TF-IDF
        
        Args:
            text: Text to extract keywords from
            top_n: Number of keywords to return
            
        Returns:
            List of (keyword, score) tuples, sorted by score descending
        """
        try:
            from sklearn.feature_extraction.text import TfidfVectorizer
            
            # Tokenize into sentences
            sentences = TextUtils.split_into_sentences(text)
            if not sentences:
                return []
                
            # Create TF-IDF vectorizer
            vectorizer = TfidfVectorizer(
                ngram_range=(1, 2),  # Include unigrams and bigrams
                stop_words='english',
                max_features=1000
            )
            
            # Fit and transform the text
            try:
                X = vectorizer.fit_transform(sentences)
            except ValueError:
                # Not enough features, try with unigrams only
                vectorizer = TfidfVectorizer(
                    ngram_range=(1, 1),
                    stop_words='english',
                    max_features=1000
                )
                X = vectorizer.fit_transform(sentences)
            
            # Get feature names and scores
            feature_array = vectorizer.get_feature_names_out()
            tfidf_sorting = X.sum(axis=0).A1.argsort()[::-1]
            
            # Get top N keywords
            top_n = min(top_n, len(feature_array))
            return [
                (feature_array[i], float(X.sum(axis=0).A1[i]))
                for i in tfidf_sorting[:top_n]
            ]
            
        except ImportError:
            # Fallback to simple word frequency if scikit-learn is not available
            from collections import Counter
            import string
            
            # Remove punctuation and convert to lowercase
            text = text.lower()
            text = text.translate(str.maketrans('', '', string.punctuation))
            
            # Count word frequencies
            words = text.split()
            word_counts = Counter(words)
            
            # Remove stopwords
            stopwords = set([
                'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', "you're", "you've",
                "you'll", "you'd", 'your', 'yours', 'yourself', 'yourselves', 'he', 'him', 'his', 'himself',
                'she', "she's", 'her', 'hers', 'herself', 'it', "it's", 'its', 'itself', 'they', 'them', 'their',
                'theirs', 'themselves', 'what', 'which', 'who', 'whom', 'this', 'that', "that'll", 'these', 'those',
                'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does',
                'did', 'doing', 'a', 'an', 'the', 'and', 'but', 'if', 'or', 'because', 'as', 'until', 'while', 'of',
                'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into', 'through', 'during', 'before',
                'after', 'above', 'below', 'to', 'from', 'up', 'down', 'in', 'out', 'on', 'off', 'over', 'under',
                'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any',
                'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
                'same', 'so', 'than', 'too', 'very', 's', 't', 'can', 'will', 'just', 'don', "don't", 'should',
                "should've", 'now', 'd', 'll', 'm', 'o', 're', 've', 'y', 'ain', 'aren', "aren't", 'couldn',
                "couldn't", 'didn', "didn't", 'doesn', "doesn't", 'hadn', "hadn't", 'hasn', "hasn't", 'haven',
                "haven't", 'isn', "isn't", 'ma', 'mightn', "mightn't", 'mustn', "mustn't", 'needn', "needn't",
                'shan', "shan't", 'shouldn', "shouldn't", 'wasn', "wasn't", 'weren', "weren't", 'won', "won't",
                'wouldn', "wouldn't"
            ])
            
            # Filter out stopwords and get top N
            keywords = [
                (word, count) for word, count in word_counts.items()
                if word not in stopwords and len(word) > 2
            ]
            
            # Sort by frequency and take top N
            keywords.sort(key=lambda x: x[1], reverse=True)
            return keywords[:top_n]
