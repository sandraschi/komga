"""
Thematic analysis module for identifying and analyzing themes in documents.
"""

from typing import List, Dict, Any, Optional, Tuple
import re
import json
import numpy as np
from collections import defaultdict, Counter
from dataclasses import dataclass
from enum import Enum
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ThemeType(str, Enum):
    """Types of themes that can be identified."""
    MAJOR = "major"
    MINOR = "minor"
    SYMBOLIC = "symbolic"
    CHARACTER_DRIVEN = "character_driven"
    PLOT_DRIVEN = "plot_driven"
    SETTING_DRIVEN = "setting_driven"

@dataclass
class Theme:
    """Represents a theme in the text."""
    name: str
    description: str
    theme_type: ThemeType
    confidence: float
    supporting_quotes: List[Dict[str, Any]]
    metadata: Dict[str, Any] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert theme to dictionary."""
        return {
            'name': self.name,
            'description': self.description,
            'theme_type': self.theme_type.value,
            'confidence': self.confidence,
            'supporting_quotes': self.supporting_quotes,
            'metadata': self.metadata or {}
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Theme':
        """Create theme from dictionary."""
        return cls(
            name=data['name'],
            description=data['description'],
            theme_type=ThemeType(data['theme_type']),
            confidence=data['confidence'],
            supporting_quotes=data.get('supporting_quotes', []),
            metadata=data.get('metadata', {})
        )

class ThematicAnalyzer:
    """Analyzes text to identify and analyze themes."""
    
    def __init__(
        self,
        llm_service: Any = None,
        min_theme_length: int = 1,
        max_theme_length: int = 3,
        min_theme_occurrences: int = 3,
        theme_confidence_threshold: float = 0.7
    ):
        """Initialize the thematic analyzer.
        
        Args:
            llm_service: Optional LLM service for advanced analysis
            min_theme_length: Minimum words in a theme phrase
            max_theme_length: Maximum words in a theme phrase
            min_theme_occurrences: Minimum occurrences to consider a phrase a theme
            theme_confidence_threshold: Minimum confidence score for a theme
        """
        self.llm_service = llm_service
        self.min_theme_length = min_theme_length
        self.max_theme_length = max_theme_length
        self.min_theme_occurrences = min_theme_occurrences
        self.theme_confidence_threshold = theme_confidence_threshold
    
    def analyze_text(
        self,
        text: str,
        title: str = None,
        author: str = None,
        metadata: Dict[str, Any] = None
    ) -> List[Theme]:
        """Analyze text to identify themes.
        
        Args:
            text: The text to analyze
            title: Optional title of the work
            author: Optional author of the work
            metadata: Additional metadata about the text
            
        Returns:
            List of identified themes
        """
        # Preprocess text
        paragraphs = self._split_into_paragraphs(text)
        
        # Extract candidate themes
        candidate_themes = self._extract_candidate_themes(paragraphs)
        
        # Score and rank themes
        ranked_themes = self._rank_themes(candidate_themes, paragraphs)
        
        # Filter by confidence threshold
        filtered_themes = [
            theme for theme in ranked_themes 
            if theme.confidence >= self.theme_confidence_threshold
        ]
        
        # If we have an LLM service, enhance with deeper analysis
        if self.llm_service:
            filtered_themes = self._enhance_with_llm(
                filtered_themes, 
                text,
                title=title,
                author=author,
                metadata=metadata
            )
        
        return filtered_themes
    
    def _split_into_paragraphs(self, text: str) -> List[Dict[str, Any]]:
        """Split text into paragraphs with metadata."""
        paragraphs = []
        current_paragraph = []
        sentence_count = 0
        
        # Simple sentence splitting (could be enhanced with NLP)
        sentences = re.split(r'(?<=\w[.!?])\s+', text)
        
        for sentence in sentences:
            current_paragraph.append(sentence)
            sentence_count += 1
            
            # Start a new paragraph after 3-7 sentences or on dialogue boundaries
            if (sentence_count >= 3 and 
                (sentence_count >= 7 or 
                 sentence.strip().endswith(('.', '!', '?')) and 
                 len(sentence) > 50)):
                
                paragraph_text = ' '.join(current_paragraph)
                paragraphs.append({
                    'text': paragraph_text,
                    'sentence_count': sentence_count,
                    'word_count': len(paragraph_text.split()),
                    'has_dialogue': any('"' in s or '\'' in s for s in current_paragraph)
                })
                
                current_paragraph = []
                sentence_count = 0
        
        # Add the last paragraph if not empty
        if current_paragraph:
            paragraph_text = ' '.join(current_paragraph)
            paragraphs.append({
                'text': paragraph_text,
                'sentence_count': sentence_count,
                'word_count': len(paragraph_text.split()),
                'has_dialogue': any('"' in s or '\'' in s for s in current_paragraph)
            })
            
        return paragraphs
    
    def _extract_candidate_themes(
        self, 
        paragraphs: List[Dict[str, Any]]
    ) -> Dict[str, Dict[str, Any]]:
        """Extract candidate themes from paragraphs."""
        # Count n-grams across the text
        ngram_counter = Counter()
        paragraph_themes = []
        
        for para in paragraphs:
            words = re.findall(r'\b\w+\b', para['text'].lower())
            
            # Extract n-grams of different lengths
            for n in range(self.min_theme_length, self.max_theme_length + 1):
                for i in range(len(words) - n + 1):
                    ngram = ' '.join(words[i:i+n])
                    ngram_counter[ngram] += 1
            
            # Also look for phrases in quotes as potential themes
            quoted_phrases = re.findall(r'"([^"]+)"', para['text'])
            for phrase in quoted_phrases:
                words_in_phrase = len(phrase.split())
                if (words_in_phrase >= self.min_theme_length and 
                    words_in_phrase <= self.max_theme_length):
                    ngram_counter[phrase.lower()] += 3  # Higher weight for quoted phrases
        
        # Filter by minimum occurrences and other criteria
        candidate_themes = {}
        for ngram, count in ngram_counter.items():
            if count >= self.min_theme_occurrences:
                # Skip common phrases, proper nouns, etc.
                if not self._is_common_phrase(ngram):
                    candidate_themes[ngram] = {
                        'count': count,
                        'type': self._classify_theme_type(ngram),
                        'paragraphs': []
                    }
        
        # Find which paragraphs mention each theme
        for para_idx, para in enumerate(paragraphs):
            para_text_lower = para['text'].lower()
            for theme in candidate_themes:
                if theme in para_text_lower:
                    candidate_themes[theme]['paragraphs'].append(para_idx)
        
        return candidate_themes
    
    def _rank_themes(
        self, 
        candidate_themes: Dict[str, Dict[str, Any]],
        paragraphs: List[Dict[str, Any]]
    ) -> List[Theme]:
        """Rank candidate themes by importance."""
        themes = []
        
        for theme_text, data in candidate_themes.items():
            # Calculate theme score based on various factors
            score = self._calculate_theme_score(theme_text, data, paragraphs)
            
            # Skip low-scoring themes
            if score < 0.3:  # Arbitrary threshold
                continue
                
            # Create theme object
            theme = Theme(
                name=theme_text.title(),
                description=f"The theme of {theme_text} is explored throughout the text.",
                theme_type=data['type'],
                confidence=min(score, 1.0),  # Cap at 1.0
                supporting_quotes=[],
                metadata={
                    'occurrences': data['count'],
                    'paragraphs': data['paragraphs']
                }
            )
            
            # Add supporting quotes (first few occurrences)
            for para_idx in data['paragraphs'][:3]:  # Limit to first 3 occurrences
                para_text = paragraphs[para_idx]['text']
                # Find the sentence containing the theme
                sentences = re.split(r'(?<=\w[.!?])\s+', para_text)
                for sent in sentences:
                    if theme_text.lower() in sent.lower():
                        theme.supporting_quotes.append({
                            'text': sent.strip(),
                            'paragraph_index': para_idx
                        })
                        break
            
            themes.append(theme)
        
        # Sort themes by confidence (descending)
        return sorted(themes, key=lambda x: x.confidence, reverse=True)
    
    def _calculate_theme_score(
        self, 
        theme_text: str, 
        theme_data: Dict[str, Any],
        paragraphs: List[Dict[str, Any]]
    ) -> float:
        """Calculate a score for a theme based on various factors."""
        score = 0.0
        
        # 1. Frequency (log scale)
        freq_score = min(np.log10(theme_data['count']) / 2.0, 1.0)  # Cap at 1.0
        score += freq_score * 0.4  # 40% weight
        
        # 2. Distribution across the text
        para_indices = theme_data['paragraphs']
        if para_indices:
            # Calculate distribution score (0-1) based on how spread out the theme is
            distribution = len(set(i // 10 for i in para_indices)) / (len(paragraphs) // 10 + 1)
            score += distribution * 0.3  # 30% weight
        
        # 3. Theme type bonus
        type_bonus = {
            ThemeType.MAJOR: 0.3,
            ThemeType.SYMBOLIC: 0.2,
            ThemeType.CHARACTER_DRIVEN: 0.15,
            ThemeType.PLOT_DRIVEN: 0.1,
            ThemeType.SETTING_DRIVEN: 0.1,
            ThemeType.MINOR: 0.0
        }.get(theme_data['type'], 0.0)
        score += type_bonus
        
        # 4. Length penalty (very short or very long themes are penalized)
        word_count = len(theme_text.split())
        if word_count < 1 or word_count > 4:
            score *= 0.8  # 20% penalty
            
        # 5. Position bonus (themes appearing early get a small bonus)
        if para_indices and para_indices[0] < len(paragraphs) * 0.1:  # First 10%
            score += 0.1
            
        return min(max(score, 0.0), 1.0)  # Clamp between 0 and 1
    
    def _enhance_with_llm(
        self, 
        themes: List[Theme],
        full_text: str,
        title: str = None,
        author: str = None,
        metadata: Dict[str, Any] = None
    ) -> List[Theme]:
        """Enhance theme analysis using an LLM."""
        if not themes or not self.llm_service:
            return themes
            
        try:
            # Prepare context for the LLM
            context = {
                'title': title or 'the text',
                'author': author or 'the author',
                'top_themes': [theme.name for theme in themes[:5]],  # Only enhance top themes
                'word_count': len(full_text.split()),
                **metadata
            }
            
            # Generate enhanced descriptions and analysis
            for theme in themes[:5]:  # Limit to top 5 themes for LLM analysis
                prompt = self._build_theme_enhancement_prompt(theme, context)
                response = self.llm_service.generate(prompt)
                
                # Parse response and update theme
                try:
                    enhanced_data = json.loads(response)
                    theme.description = enhanced_data.get('description', theme.description)
                    theme.theme_type = ThemeType(enhanced_data.get('type', theme.theme_type.value))
                    theme.metadata['llm_analysis'] = enhanced_data.get('analysis', '')
                    
                    # Update confidence based on LLM analysis
                    if 'confidence' in enhanced_data:
                        # Weighted average between original and LLM confidence
                        theme.confidence = (theme.confidence * 0.7 + 
                                         float(enhanced_data['confidence']) * 0.3)
                except (json.JSONDecodeError, ValueError) as e:
                    logger.warning(f"Failed to parse LLM response for theme {theme.name}: {e}")
            
            return themes
            
        except Exception as e:
            logger.error(f"Error enhancing themes with LLM: {e}")
            return themes
    
    def _build_theme_enhancement_prompt(
        self, 
        theme: Theme,
        context: Dict[str, Any]
    ) -> str:
        """Build a prompt for enhancing a theme with an LLM."""
        return f"""Analyze the theme "{theme.name}" in the context of {context['title']} by {context['author']}.
        
Current theme description: {theme.description}
Theme type: {theme.theme_type.value}
Number of occurrences: {theme.metadata.get('occurrences', 0)}

Please provide an enhanced analysis including:
1. A more detailed and nuanced description of this theme
2. The theme type (choose from: {', '.join(t.value for t in ThemeType)})
3. The theme's significance in the work
4. A confidence score (0.0-1.0) in your analysis
5. Any related themes or motifs

Format your response as JSON with these keys: description, type, analysis, confidence, related_themes.

JSON Response:"""
    
    def _classify_theme_type(self, theme_text: str) -> ThemeType:
        """Classify the type of theme."""
        words = theme_text.split()
        
        # Check for character names or pronouns
        if (any(word.istitle() for word in words) or 
            any(word in ['he', 'she', 'they', 'him', 'her', 'them'] for word in words)):
            return ThemeType.CHARACTER_DRIVEN
            
        # Check for action verbs (plot-driven)
        action_verbs = {'run', 'fight', 'discover', 'find', 'solve', 'escape', 'win', 'lose'}
        if any(word in action_verbs for word in words):
            return ThemeType.PLOT_DRIVEN
            
        # Check for setting-related terms
        setting_terms = {'city', 'house', 'forest', 'mountain', 'ocean', 'world', 'land', 'place'}
        if any(word in setting_terms for word in words):
            return ThemeType.SETTING_DRIVEN
            
        # Check for abstract concepts (symbolic)
        abstract_terms = {'love', 'death', 'time', 'freedom', 'justice', 'power', 'fear', 'hope'}
        if any(word in abstract_terms for word in words):
            return ThemeType.SYMBOLIC
            
        # Default to minor theme
        return ThemeType.MINOR
    
    def _is_common_phrase(self, phrase: str) -> bool:
        """Check if a phrase is too common to be a meaningful theme."""
        common_phrases = {
            'the', 'and', 'but', 'or', 'if', 'then', 'because', 'when', 'where', 
            'how', 'what', 'why', 'this', 'that', 'these', 'those', 'there', 'here',
            'for', 'with', 'without', 'about', 'into', 'through', 'after', 'before',
            'some', 'any', 'all', 'none', 'both', 'either', 'neither', 'each', 'every',
            'very', 'quite', 'rather', 'somewhat', 'too', 'so', 'just', 'only', 'even'
        }
        
        words = phrase.lower().split()
        
        # Single-word phrases are usually too common
        if len(words) == 1:
            return words[0] in common_phrases
            
        # Check if all words are common
        if all(word in common_phrases for word in words):
            return True
            
        # Check for common patterns
        common_patterns = [
            r'^the \w+ of \w+$',  # "the X of Y"
            r'^in the \w+$',         # "in the X"
            r'^on the \w+$',         # "on the X"
            r'^at the \w+$',         # "at the X"
            r'^for the \w+$',        # "for the X"
            r'^with the \w+$',       # "with the X"
            r'^to be \w+$',          # "to be X"
            r'^it is \w+$',          # "it is X"
            r'^there is \w+$',       # "there is X"
            r'^there are \w+$'       # "there are X"
        ]
        
        phrase_lower = phrase.lower()
        return any(re.match(pattern, phrase_lower) for pattern in common_patterns)

# Example usage
if __name__ == "__main__":
    # Example text for analysis
    sample_text = """
    The theme of power is central to the novel. The protagonist struggles with the 
    responsibility that comes with power. "Power corrupts," the old man said, 
    "and absolute power corrupts absolutely." This idea is revisited throughout 
    the story as the main character rises to a position of authority.
    
    Another important theme is the conflict between good and evil. The protagonist 
    must choose between an easy but morally questionable path and a difficult 
    but righteous one. This internal struggle defines much of the character's journey.
    """
    
    # Initialize analyzer
    analyzer = ThematicAnalyzer(
        min_theme_occurrences=1,  # Lower for example purposes
        theme_confidence_threshold=0.5
    )
    
    # Analyze text
    themes = analyzer.analyze_text(
        sample_text,
        title="Sample Novel",
        author="Jane Doe"
    )
    
    # Print results
    print(f"Identified {len(themes)} themes:")
    for i, theme in enumerate(themes, 1):
        print(f"\n{i}. {theme.name} ({theme.theme_type.value}, confidence: {theme.confidence:.2f})")
        print(f"   {theme.description}")
        if theme.supporting_quotes:
            print("   Example quote:", theme.supporting_quotes[0]['text'])
