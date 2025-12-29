import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime, timedelta
import json
from typing import List, Dict

# Page configuration
st.set_page_config(
    page_title="Helena Production Planning",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Initialize session state
if 'production_lines' not in st.session_state:
    st.session_state.production_lines = []

if 'production_data' not in st.session_state:
    st.session_state.production_data = []


class ProductionLine:
    """Represents a production line with capacity information"""
    def __init__(self, name: str, max_capacity: float, unit: str = "units/hour"):
        self.name = name
        self.max_capacity = max_capacity
        self.unit = unit
        self.id = len(st.session_state.production_lines)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'max_capacity': self.max_capacity,
            'unit': self.unit
        }


def add_production_data(line_id: int, date: str, actual_production: float):
    """Add production data for a specific line and date"""
    st.session_state.production_data.append({
        'line_id': line_id,
        'date': date,
        'actual_production': actual_production,
        'timestamp': datetime.now().isoformat()
    })


def calculate_utilization(line_id: int, actual_production: float) -> float:
    """Calculate capacity utilization percentage"""
    line = next((l for l in st.session_state.production_lines if l.id == line_id), None)
    if line and line.max_capacity > 0:
        return (actual_production / line.max_capacity) * 100
    return 0.0


def get_capacity_dataframe() -> pd.DataFrame:
    """Get a dataframe with capacity utilization data"""
    data = []
    for prod_data in st.session_state.production_data:
        line = next((l for l in st.session_state.production_lines if l.id == prod_data['line_id']), None)
        if line:
            utilization = calculate_utilization(prod_data['line_id'], prod_data['actual_production'])
            data.append({
                'Line': line.name,
                'Date': pd.to_datetime(prod_data['date']),
                'Actual Production': prod_data['actual_production'],
                'Max Capacity': line.max_capacity,
                'Utilization %': utilization,
                'Unit': line.unit
            })
    
    if not data:
        return pd.DataFrame()
    
    df = pd.DataFrame(data)
    return df.sort_values('Date')


def create_utilization_chart(df: pd.DataFrame):
    """Create a line chart showing capacity utilization over time"""
    if df.empty:
        return None
    
    fig = px.line(
        df,
        x='Date',
        y='Utilization %',
        color='Line',
        title='Production Line Capacity Utilization Over Time',
        labels={'Utilization %': 'Capacity Utilization (%)', 'Date': 'Date'},
        markers=True
    )
    
    # Add 100% capacity line
    fig.add_hline(
        y=100,
        line_dash="dash",
        line_color="red",
        annotation_text="100% Capacity",
        annotation_position="right"
    )
    
    # Add 80% warning line
    fig.add_hline(
        y=80,
        line_dash="dot",
        line_color="orange",
        annotation_text="80% Warning",
        annotation_position="right"
    )
    
    fig.update_layout(
        height=500,
        hovermode='x unified',
        xaxis_title="Date",
        yaxis_title="Capacity Utilization (%)",
        legend_title="Production Line"
    )
    
    return fig


def create_capacity_comparison_chart(df: pd.DataFrame):
    """Create a bar chart comparing current capacity utilization across lines"""
    if df.empty:
        return None
    
    # Get the most recent data for each line
    latest_data = df.sort_values('Date').groupby('Line').last().reset_index()
    
    fig = px.bar(
        latest_data,
        x='Line',
        y='Utilization %',
        title='Current Capacity Utilization by Production Line',
        labels={'Utilization %': 'Capacity Utilization (%)', 'Line': 'Production Line'},
        color='Utilization %',
        color_continuous_scale=['green', 'yellow', 'orange', 'red'],
        text='Utilization %'
    )
    
    fig.update_traces(texttemplate='%{text:.1f}%', textposition='outside')
    fig.update_layout(
        height=400,
        xaxis_title="Production Line",
        yaxis_title="Capacity Utilization (%)",
        showlegend=False
    )
    
    # Add 100% capacity line
    fig.add_hline(
        y=100,
        line_dash="dash",
        line_color="red",
        annotation_text="100% Capacity"
    )
    
    return fig


def create_capacity_timeline_chart(df: pd.DataFrame):
    """Create a stacked area chart showing capacity usage over time"""
    if df.empty:
        return None
    
    fig = px.area(
        df,
        x='Date',
        y='Actual Production',
        color='Line',
        title='Production Output Over Time',
        labels={'Actual Production': f'Production ({df["Unit"].iloc[0] if not df.empty else "units"})', 'Date': 'Date'},
        facet_col=None
    )
    
    # Add max capacity lines for each production line
    for line_name in df['Line'].unique():
        line_data = df[df['Line'] == line_name]
        if not line_data.empty:
            max_cap = line_data['Max Capacity'].iloc[0]
            fig.add_hline(
                y=max_cap,
                line_dash="dash",
                line_color="red",
                opacity=0.5,
                annotation_text=f"{line_name} Max: {max_cap}"
            )
    
    fig.update_layout(
        height=500,
        hovermode='x unified',
        xaxis_title="Date",
        yaxis_title=f"Production Output",
        legend_title="Production Line"
    )
    
    return fig


# Main App
st.title("📊 Helena Production Planning Tool")
st.markdown("### Review Line Capacity and Monitor Utilization")

# Sidebar for adding production lines
with st.sidebar:
    st.header("⚙️ Configuration")
    
    st.subheader("Add Production Line")
    with st.form("add_line_form"):
        line_name = st.text_input("Line Name", placeholder="e.g., Line A, Assembly Line 1")
        max_capacity = st.number_input("Max Capacity", min_value=0.0, value=100.0, step=10.0)
        unit = st.selectbox("Unit", ["units/hour", "units/day", "units/week", "units/month", "units"])
        
        submitted = st.form_submit_button("Add Production Line")
        if submitted and line_name:
            new_line = ProductionLine(line_name, max_capacity, unit)
            st.session_state.production_lines.append(new_line)
            st.success(f"Added {line_name} with capacity {max_capacity} {unit}")
            st.rerun()
    
    st.divider()
    
    st.subheader("Add Production Data")
    if st.session_state.production_lines:
        with st.form("add_data_form"):
            selected_line = st.selectbox(
                "Select Production Line",
                options=[(l.id, l.name) for l in st.session_state.production_lines],
                format_func=lambda x: x[1]
            )
            production_date = st.date_input("Production Date", value=datetime.now().date())
            actual_production = st.number_input("Actual Production", min_value=0.0, value=0.0, step=1.0)
            
            data_submitted = st.form_submit_button("Add Production Data")
            if data_submitted:
                line_id = selected_line[0]
                add_production_data(line_id, production_date.isoformat(), actual_production)
                utilization = calculate_utilization(line_id, actual_production)
                st.success(f"Added data: {utilization:.1f}% utilization")
                st.rerun()
    else:
        st.info("Add a production line first")
    
    st.divider()
    
    st.subheader("Manage Data")
    if st.button("Clear All Data", type="secondary"):
        st.session_state.production_lines = []
        st.session_state.production_data = []
        st.rerun()

# Main content area
if not st.session_state.production_lines:
    st.info("👈 Start by adding a production line in the sidebar")
else:
    # Display production lines summary
    st.subheader("Production Lines Overview")
    lines_df = pd.DataFrame([line.to_dict() for line in st.session_state.production_lines])
    st.dataframe(
        lines_df[['name', 'max_capacity', 'unit']],
        column_config={
            'name': 'Line Name',
            'max_capacity': 'Max Capacity',
            'unit': 'Unit'
        },
        hide_index=True,
        use_container_width=True
    )
    
    # Get capacity data
    capacity_df = get_capacity_dataframe()
    
    if capacity_df.empty:
        st.info("Add production data to see capacity utilization graphs")
    else:
        # Key Metrics
        st.subheader("📈 Key Metrics")
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            avg_utilization = capacity_df['Utilization %'].mean()
            st.metric("Average Utilization", f"{avg_utilization:.1f}%")
        
        with col2:
            max_utilization = capacity_df['Utilization %'].max()
            st.metric("Peak Utilization", f"{max_utilization:.1f}%")
        
        with col3:
            total_lines = len(capacity_df['Line'].unique())
            st.metric("Active Lines", total_lines)
        
        with col4:
            total_data_points = len(capacity_df)
            st.metric("Data Points", total_data_points)
        
        st.divider()
        
        # Charts
        st.subheader("📊 Capacity Utilization Charts")
        
        # Utilization over time
        utilization_chart = create_utilization_chart(capacity_df)
        if utilization_chart:
            st.plotly_chart(utilization_chart, use_container_width=True)
        
        # Current capacity comparison
        col1, col2 = st.columns(2)
        with col1:
            comparison_chart = create_capacity_comparison_chart(capacity_df)
            if comparison_chart:
                st.plotly_chart(comparison_chart, use_container_width=True)
        
        with col2:
            timeline_chart = create_capacity_timeline_chart(capacity_df)
            if timeline_chart:
                st.plotly_chart(timeline_chart, use_container_width=True)
        
        # Detailed data table
        st.subheader("📋 Detailed Production Data")
        st.dataframe(
            capacity_df,
            column_config={
                'Date': st.column_config.DateColumn('Date', format="YYYY-MM-DD"),
                'Utilization %': st.column_config.NumberColumn('Utilization %', format="%.1f%%"),
                'Actual Production': st.column_config.NumberColumn('Actual Production', format="%.2f"),
                'Max Capacity': st.column_config.NumberColumn('Max Capacity', format="%.2f")
            },
            hide_index=True,
            use_container_width=True
        )

