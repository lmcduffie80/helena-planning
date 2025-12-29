# Helena Production Planning Tool

A comprehensive production planning tool for reviewing line capacity and visualizing capacity utilization percentages. This web-based application helps production managers monitor and analyze production line performance in real-time.

## Features

- **Production Line Management**: Add and configure multiple production lines with custom capacity limits
- **Capacity Tracking**: Record actual production data for each line over time
- **Utilization Analysis**: Automatically calculate and display capacity utilization percentages
- **Interactive Visualizations**:
  - Line chart showing capacity utilization trends over time
  - Bar chart comparing current utilization across all lines
  - Area chart displaying production output timeline
- **Key Metrics Dashboard**: View average utilization, peak utilization, and other key performance indicators
- **Data Management**: Easy-to-use interface for adding production lines and recording production data

## Installation

1. Clone this repository:
```bash
git clone https://github.com/lmcduffie80/helena-planning.git
cd helena-planning
```

2. Create a virtual environment (recommended):
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

## Usage

1. Start the Streamlit application:
```bash
streamlit run app.py
```

2. The application will open in your default web browser at `http://localhost:8501`

3. **Add Production Lines**:
   - Use the sidebar to add production lines
   - Specify the line name, maximum capacity, and unit of measurement

4. **Record Production Data**:
   - Select a production line
   - Enter the production date and actual production amount
   - The tool will automatically calculate utilization percentage

5. **View Analytics**:
   - Capacity utilization graphs are displayed automatically
   - Review key metrics in the dashboard
   - Explore detailed production data in the data table

## Features in Detail

### Capacity Utilization Calculation
The tool calculates capacity utilization as:
```
Utilization % = (Actual Production / Max Capacity) × 100
```

### Visual Indicators
- **Green**: Utilization below 80% (healthy)
- **Yellow/Orange**: Utilization 80-100% (warning)
- **Red**: Utilization at or above 100% (over capacity)

### Charts
- **Utilization Over Time**: Track how capacity utilization changes for each line
- **Current Comparison**: See which lines are currently at capacity
- **Production Timeline**: Visualize actual production output vs. capacity limits

## Technology Stack

- **Streamlit**: Web application framework
- **Pandas**: Data manipulation and analysis
- **Plotly**: Interactive data visualization
- **Python 3.8+**: Programming language

## Deployment

### Vercel (Current Deployment)

This project is configured for Vercel deployment with a static HTML/JavaScript frontend.

1. **Automatic Deployment**: If connected to GitHub, Vercel will automatically deploy on every push
2. **Manual Deployment**: 
   ```bash
   npm i -g vercel
   vercel
   ```

**Important Notes for Vercel:**
- The app uses `index.html` as the entry point (not `app.py`)
- Data is stored in browser localStorage (client-side)
- The API endpoint at `/api` is available for future database integration
- No build step required - Vercel serves static files directly

**Troubleshooting 404 Error on Vercel:**
- Ensure `index.html` is in the root directory
- Verify `vercel.json` is present and correctly configured
- Check that `app.js` is in the root directory
- Make sure the deployment is pointing to the correct branch
- The app should be accessible at your Vercel domain (e.g., `helena-planning.vercel.app`)

### Streamlit Cloud (Alternative)

1. Push your code to GitHub
2. Go to [share.streamlit.io](https://share.streamlit.io)
3. Click "New app" and connect your GitHub repository
4. Set the main file path to: `app.py`
5. Click "Deploy"

**Troubleshooting 404 Error on Streamlit Cloud:**
- Ensure `app.py` is in the root directory
- Verify `requirements.txt` is present and up-to-date
- Check that the repository is public (or you have Streamlit Cloud access)
- Make sure you've selected the correct branch
- Wait a few minutes for the initial deployment to complete

### Heroku

1. Install Heroku CLI and login
2. Create a new Heroku app:
   ```bash
   heroku create your-app-name
   ```
3. Deploy:
   ```bash
   git push heroku main
   ```

The `Procfile` and `setup.sh` are already configured for Heroku deployment.

### Other Platforms

For other platforms (AWS, Google Cloud, Azure, etc.):
- Ensure the entry point is set to `app.py`
- Use the command: `streamlit run app.py --server.port=$PORT --server.address=0.0.0.0`
- Make sure all dependencies in `requirements.txt` are installed

## Project Structure

```
helena-planning/
├── index.html               # Main HTML file (Vercel deployment)
├── app.js                   # JavaScript application logic
├── app.py                   # Streamlit application (alternative deployment)
├── api/
│   └── index.py             # Vercel serverless API endpoint
├── vercel.json              # Vercel deployment configuration
├── requirements.txt         # Python dependencies
├── Procfile                 # Heroku deployment configuration
├── setup.sh                 # Deployment setup script
├── runtime.txt             # Python version specification
├── .streamlit/
│   └── config.toml         # Streamlit configuration
├── README.md               # Project documentation
└── .gitignore              # Git ignore file
```

**Note**: This project supports two deployment options:
- **Vercel**: Uses `index.html` + `app.js` (static frontend)
- **Streamlit Cloud/Heroku**: Uses `app.py` (Python Streamlit app)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available for use.

## Support

For issues or questions, please open an issue on the GitHub repository.
