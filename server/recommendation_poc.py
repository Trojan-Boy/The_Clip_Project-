
import json
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

def get_recommendations(user_liked_articles, all_articles):
    """
    Generates personalized article recommendations based on user's liked articles.

    Args:
        user_liked_articles (list): A list of titles of articles the user has liked.
        all_articles (list): A list of dictionaries, where each dictionary
                              represents an article with at least a 'title' key.

    Returns:
        list: A ranked list of recommended article titles and URLs.
    """

    if not all_articles:
        return []

    # Extract titles and URLs for TF-IDF
    article_texts = [article['title'] + " " + article['url'] for article in all_articles]

    # Initialize TF-IDF Vectorizer with stop words removal
    tfidf_vectorizer = TfidfVectorizer(stop_words='english')

    # Fit and transform all article texts
    tfidf_matrix = tfidf_vectorizer.fit_transform(article_texts)

    # Find the indices of the liked articles
    # This assumes 'user_liked_articles' contains titles.
    # We need to find the full text that was used for vectorization.
    liked_article_indices = []
    for liked_title in user_liked_articles:
        for i, article in enumerate(all_articles):
            if article['title'] == liked_title:
                liked_article_indices.append(i)
                break


    if not liked_article_indices:
        print("No liked articles found in the provided article list.")
        return []

    # Create a profile for the user based on their liked articles
    # Ensure the user_profile_vector is a numpy array
    user_profile_vector = np.asarray(tfidf_matrix[liked_article_indices].mean(axis=0))

    # Calculate cosine similarity between user profile and all articles
    cosine_similarities = cosine_similarity(user_profile_vector, tfidf_matrix)

    # Get the similarity scores for the user profile against all articles
    similarity_scores = list(enumerate(cosine_similarities[0]))

    # Sort articles by similarity score in descending order
    # Exclude articles the user has already liked
    recommended_articles = sorted([
        (index, score) for index, score in similarity_scores if index not in liked_article_indices
    ], key=lambda x: x[1], reverse=True)

    # Get the top N recommendations (e.g., top 20)
    top_n = 20
    recommendation_list = []
    for index, score in recommended_articles[:top_n]:
        recommendation_list.append({
            'title': all_articles[index]['title'],
            'url': all_articles[index]['url'],
            'score': score
        })

    return recommendation_list

if __name__ == "__main__":
    # Load articles from parsed_data.json
    try:
        with open('parsed_data.json', 'r') as f:
            data = json.load(f)
            all_articles = data.get('hackernews_articles', [])
    except FileNotFoundError:
        print("parsed_data.json not found. Please ensure the file exists.")
        all_articles = []
    except json.JSONDecodeError:
        print("Error decoding JSON from parsed_data.json.")
        all_articles = []

    if not all_articles:
        print("No articles loaded. Exiting.")
    else:
        # Simulate user liked articles
        # In a real scenario, this would come from user interaction data
        user_liked_articles = [
            "How to make a fast dynamic language interpreter",
            "A Roblox cheat and one AI tool brought down Vercel's platform",
            "Anthropic says OpenClaw-style Claude CLI usage is allowed again",
            "Show HN: Mediator.ai – Using Nash bargaining and LLMs to systematize fairness",
            "Qwen3.6-Max-Preview: Smarter, Sharper, Still Evolving"
        ]

        print(f"User liked articles: {user_liked_articles}")

        recommendations = get_recommendations(user_liked_articles, all_articles)

        if recommendations:
            print("Recommended articles:")
            for rec in recommendations:
                print(f"- {rec['title']} (Score: {rec['score']:.2f})")
                print(f"  URL: {rec['url']}")
        else:
            print("No recommendations generated.")
