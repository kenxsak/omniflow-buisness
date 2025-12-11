"use client";

/**
 * ROI Calculator Component
 * 
 * Interactive widget for calculating marketing ROI
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calculator, TrendingUp, DollarSign, Users, Target } from 'lucide-react';
import {
  calculateROI,
  calculateROAS,
  calculateCostPerLead,
  calculateCAC,
  formatCurrency,
  formatPercentage,
} from '@/lib/analytics-service';

export default function ROICalculator() {
  const [revenue, setRevenue] = useState<string>('1000');
  const [spend, setSpend] = useState<string>('500');
  const [leads, setLeads] = useState<string>('50');
  const [customers, setCustomers] = useState<string>('5');
  
  const revenueNum = parseFloat(revenue) || 0;
  const spendNum = parseFloat(spend) || 0;
  const leadsNum = parseInt(leads) || 0;
  const customersNum = parseInt(customers) || 0;
  
  const roi = calculateROI(revenueNum, spendNum);
  const roas = calculateROAS(revenueNum, spendNum);
  const cpl = calculateCostPerLead(spendNum, leadsNum);
  const cac = calculateCAC(spendNum, customersNum);
  
  const handleReset = () => {
    setRevenue('1000');
    setSpend('500');
    setLeads('50');
    setCustomers('5');
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          ROI Calculator
        </CardTitle>
        <CardDescription>Calculate your marketing return on investment</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Input Fields */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="revenue">Total Revenue ($)</Label>
            <Input
              id="revenue"
              type="number"
              value={revenue}
              onChange={(e) => setRevenue(e.target.value)}
              placeholder="1000"
              min="0"
              step="0.01"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="spend">Marketing Spend ($)</Label>
            <Input
              id="spend"
              type="number"
              value={spend}
              onChange={(e) => setSpend(e.target.value)}
              placeholder="500"
              min="0"
              step="0.01"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="leads">Leads Generated</Label>
            <Input
              id="leads"
              type="number"
              value={leads}
              onChange={(e) => setLeads(e.target.value)}
              placeholder="50"
              min="0"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="customers">Customers Acquired</Label>
            <Input
              id="customers"
              type="number"
              value={customers}
              onChange={(e) => setCustomers(e.target.value)}
              placeholder="5"
              min="0"
            />
          </div>
        </div>
        
        {/* Results */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-xs font-medium text-muted-foreground">ROI</span>
            </div>
            <div className={`text-2xl font-bold ${roi >= 100 ? 'text-green-600' : roi >= 0 ? 'text-orange-600' : 'text-red-600'}`}>
              {roi === Infinity ? '∞' : formatPercentage(roi, 0)}
            </div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <DollarSign className="h-4 w-4 text-blue-500" />
              <span className="text-xs font-medium text-muted-foreground">ROAS</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {roas.toFixed(2)}x
            </div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Users className="h-4 w-4 text-purple-500" />
              <span className="text-xs font-medium text-muted-foreground">CPL</span>
            </div>
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(cpl)}
            </div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Target className="h-4 w-4 text-orange-500" />
              <span className="text-xs font-medium text-muted-foreground">CAC</span>
            </div>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(cac)}
            </div>
          </div>
        </div>
        
        {/* Explanation */}
        <div className="space-y-2 text-sm text-muted-foreground">
          <p><strong>ROI (Return on Investment):</strong> Measures profitability. {roi >= 100 ? '✅ Profitable' : roi >= 0 ? '⚠️ Break-even' : '❌ Losing money'}</p>
          <p><strong>ROAS (Return on Ad Spend):</strong> For every $1 spent, you earn ${roas.toFixed(2)}</p>
          <p><strong>CPL (Cost Per Lead):</strong> You spend {formatCurrency(cpl)} to acquire each lead</p>
          <p><strong>CAC (Customer Acquisition Cost):</strong> It costs {formatCurrency(cac)} to acquire each customer</p>
        </div>
        
        <Button onClick={handleReset} variant="outline" className="w-full">
          Reset Calculator
        </Button>
      </CardContent>
    </Card>
  );
}
