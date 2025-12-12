import matplotlib.pyplot as plt
import numpy as np

# --- CONFIGURATION ---
# Use a clean style for presentation
plt.style.use('seaborn-v0_8-whitegrid')

# Data from your benchmark
models = ['Baseline (Gemini Flash)', 'Orbit (Fine-Tuned)']
leakage_rates = [17.5, 5.0]  # The "Failure" rate
success_rates = [100 - 17.5, 100 - 5.0]  # The "Success" rate

# Colors: Red for danger (leakage), Green for safety (Orbit)
colors = ['#FF6B6B', '#4ECDC4'] # Soft Red, Soft Teal

# ==========================================
# CHART 1: The "Leakage Rate" Comparison
# ==========================================
def plot_leakage_comparison():
    fig, ax = plt.subplots(figsize=(8, 6))
    
    # Create Bars
    bars = ax.bar(models, leakage_rates, color=['#d62728', '#2ca02c'], width=0.6)
    
    # Styling
    ax.set_ylabel('Code Leakage Rate (%)', fontsize=12, fontweight='bold')
    ax.set_title('Adversarial Attack Survival: Code Leakage', fontsize=14, fontweight='bold', pad=20)
    ax.set_ylim(0, 25)  # Set limit slightly higher than max value
    
    # Add Value Labels on top of bars
    for bar in bars:
        height = bar.get_height()
        ax.text(bar.get_x() + bar.get_width()/2., height + 0.5,
                f'{height}%',
                ha='center', va='bottom', fontsize=12, fontweight='bold')

    # Add a text box explaining the result
    text_str = (f"Baseline leaked code in {leakage_rates[0]}% of attacks.\n"
                f"Orbit resisted {success_rates[1]}% of attacks.")
    props = dict(boxstyle='round', facecolor='wheat', alpha=0.3)
    ax.text(0.95, 0.95, text_str, transform=ax.transAxes, fontsize=10,
            verticalalignment='top', horizontalalignment='right', bbox=props)

    plt.tight_layout()
    plt.savefig('chart_leakage_rate.png', dpi=300)
    print("Generated chart_leakage_rate.png")

# ==========================================
# CHART 2: The "Grouped" Breakdown (Success vs Failure)
# ==========================================
def plot_grouped_breakdown():
    fig, ax = plt.subplots(figsize=(10, 6))
    
    x = np.arange(len(models))
    width = 0.35  # Width of bars

    # Plotting "Safe" vs "Unsafe" side-by-side
    rects1 = ax.bar(x - width/2, success_rates, width, label='Safe Refusal', color='#2ca02c')
    rects2 = ax.bar(x + width/2, leakage_rates, width, label='Code Leakage (Failure)', color='#d62728')

    # Labels & Title
    ax.set_ylabel('Percentage of Responses', fontsize=12)
    ax.set_title('Model Robustness: Safety vs Failure Rates', fontsize=14, fontweight='bold')
    ax.set_xticks(x)
    ax.set_xticklabels(models, fontsize=11)
    ax.set_ylim(0, 110)
    ax.legend()

    # Function to add labels
    def autolabel(rects):
        for rect in rects:
            height = rect.get_height()
            ax.annotate(f'{height:.1f}%',
                        xy=(rect.get_x() + rect.get_width() / 2, height),
                        xytext=(0, 3),  # 3 points vertical offset
                        textcoords="offset points",
                        ha='center', va='bottom', fontsize=10, fontweight='bold')

    autolabel(rects1)
    autolabel(rects2)

    plt.tight_layout()
    plt.savefig('chart_grouped_robustness.png', dpi=300)
    print("Generated chart_grouped_robustness.png")

# Run both
if __name__ == "__main__":
    plot_leakage_comparison()
    plot_grouped_breakdown()